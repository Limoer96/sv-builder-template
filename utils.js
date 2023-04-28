exports.getTypeWithGenericType = function getTypeWithGenericType(title) {
  // 一般情况下类似于ApiResult«FileResp»的泛型
  const reg = /(\w+)«(\w+)»$/
  const result = reg.exec(title)
  // 另一种global.Response-api_GitTokenResponse的情况，需要处理类型本身和泛型
  // global.Response-string
  const reg1 = /\w+\.(\w+)-(\w+_(\w+)|\w+)$/
  const result1 = reg1.exec(title)
  // 如果是泛型的情况
  if(result || result1) {
    return {
      type: result ? result[1] : result1[1],
      generic: result ? result[2] : (result1[3] || result1[2])
    }
  }
  // 普通类型
  const normalReg = /\w+\.(\w+)$/
  const normalResult = normalReg.exec(title)
  if (normalResult) {
    return {
      type: normalResult[1],
      generic: null
    }
  }
  return {
    type: title,
    generic: null
  }
}

// 取得以下五种类型的类型定义和泛型
// #/definitions/TrackingEntryBatchDTO
// #/definitions/ApiResult«int»
// #/definitions/global.Response-api_GitTokenResponse
// #/definitions/global.Response-string
// #/definitions/models.UserBasic
