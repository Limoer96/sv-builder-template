const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const prettier = require('prettier')

const fsp = fs.promises
function isEmpty(value) {
  return value == undefined || value === ''
}
/**
 * 写入文件
 * @param {string} fileName 文件名
 * @param {string} content 文本内容
 */
function writeFile(fileName, content) {
  if (!fileName || isEmpty(content)) {
    return
  }
  fsp.writeFile(fileName, content).catch((err) => {
    console.error('写入文件错误', err.message)
  })
}

const TypeMap = {
  integer: 'number',
  string: 'string',
  number: 'number',
}

class Template {
  constructor(docs) {
    this.docs = docs
    const config = global.SERVICE_CONFIG || {}
    this.rootDir = path.join(process.cwd(), config.outDir)
    this.ext = config.ext // 扩展名
    this.currentDoc = docs[0]
  }
  renderContent() {
    const multiMethod = this.docs && this.docs.length > 1
    for (let doc of this.docs) {
      this.currentDoc = doc
      const { fileName, dirName, method } = doc
      const relativePath = path.join(this.rootDir, dirName)
      const fName = multiMethod
        ? `${fileName}${method}${this.ext}`
        : `${fileName}${this.ext}`
      const filePath = path.join(relativePath, fName)
      let content = this.getTemplateContent(doc)
      content = prettier.format(content, {
        semi: false,
        singleQuote: true,
        printWidth: 130,
        parser: this.ext === '.ts' ? 'typescript' : 'babel',
      })
      mkdirp(relativePath).then(() => {
        writeFile(filePath, content)
      })
    }
  }
  getTypeParams() {
    const { params } = this.currentDoc
    if (!params || !params.length === 0) {
      return
    }
    let bodyParams = 'any'
    const queryParams = []
    for (let param of params) {
      if (param.in === 'query') {
        queryParams.push({
          ...param,
          type: TypeMap[param.type],
        })
      }
      if (param.in === 'body') {
        bodyParams = `defs.${param.schema.originalRef}`
      }
    }
    return [queryParams, bodyParams]
  }
  getTypeQueryParams(paramsList) {
    if (!paramsList || paramsList.length === 0) {
      return ''
    }
    return paramsList
      .map((param) => {
        const { description, name, required, type } = param
        return `
        /** ${description} */
        ${name}${required ? '' : '?'}: ${type}\n
      `
      })
      .join('')
  }
  getTemplateContent(doc) {
    console.warn('使用预定义的`getTemplateContent`将无法输出结果')
    return ''
  }
}

module.exports = Template
