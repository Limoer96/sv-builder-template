const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const prettier = require('prettier')
const { getTypeWithGenericType } = require('./utils')
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

const simpleTypeList = ['string', 'number', 'integer']

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
      return {}
    }
    let bodyParams = ''
    const queryParams = []
    const pathParams = []
    for (let param of params) {
      if (param.in === 'query') {
        // 对于查询参数，重写其type
        queryParams.push({
          ...param,
          type: TypeMap[param.type],
        })
      }
      // 对于body参数，获取其类型定义
      if (param.in === 'body') {
        const ref = param.schema.$ref
        const { type, generic } = getTypeWithGenericType(ref.replace('#/definitions/', ''))
        bodyParams = generic ? `defs.${type}<${generic}>` : `defs.${type}`
      }
      if (param.in === 'path') {
        pathParams.push({
          ...param,
          type: TypeMap[param.type]
        })
      }
    }
    return {
      queryParams,
      bodyParams,
      pathParams
    }
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
  getUrl() {
    const { pathParams } = this.getTypeParams()
    if (!pathParams) {
      return this.currentDoc.url
    } else {
      let url = this.currentDoc.url
      for (const param of pathParams) {
        url = url.replace(`{${param.name}}`, `\$\{path.${param.name}\}`)
      }
      return url
    }
  }
  getResponseType() {
    const okResponse = this.currentDoc.doc.responses['200']
    if (okResponse.type) {
      return okResponse.schema.type
    }
    const ref = okResponse.schema.$ref
    const { type, generic } = getTypeWithGenericType(ref.replace('#/definitions/', ''))
    if (generic) {
      const genericStr = simpleTypeList.includes(generic) ? generic : `defs.${generic}`
      return `defs.${type}<${genericStr}>`
    }
    return simpleTypeList.includes(type) ? type : `defs.${type}`
  }
  getTemplateContent(doc) {
    console.warn('使用预定义的`getTemplateContent`将无法输出结果')
    return ''
  }
}

module.exports = Template
