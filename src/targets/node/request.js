'use strict'

var util = require('util')
var path = require('path')

module.exports = function (source, options) {
  var opts = util._extend({
    indent: '  '
  }, options)

  var includeFS = false
  var code = ['var request = require("request");', null]

  var reqOpts = {
    method: source.method,
    url: source.url
  }

  if (Object.keys(source.queryObj).length) {
    reqOpts.qs = source.queryObj
  }

  if (Object.keys(source.headersObj).length) {
    reqOpts.headers = source.headersObj
  }

  switch (source.postData.mimeType) {
    case 'application/x-www-form-urlencoded':
      reqOpts.form = source.postData.paramsObj
      break

    case 'application/json':
      if (source.postData.jsonObj) {
        reqOpts.body = source.postData.jsonObj
        reqOpts.json = true
      }
      break

    case 'multipart/form-data':
      reqOpts.formData = {}

      source.postData.params.forEach(function (param) {
        var attachement = {}

        if (param.value) {
          attachement.value = param.value
        } else if (param.fileName) {
          includeFS = true
          attachement.value = 'fs.createReadStream("' + param.fileName + '")'
        }

        if (param.fileName) {
          var base = path.parse(param.fileName).base

          attachement.options = {
            filename: base.length ? base : 'filename',
            contentType: param.contentType ? param.contentType : null
          }
        }

        reqOpts.formData[param.name] = attachement
      })
      break

    default:
      if (source.postData.text !== '') {
        reqOpts.body = source.postData.text
      }
  }

  // construct cookies argument
  if (source.cookies.length) {
    reqOpts.jar = 'JAR'

    code.push(null)
    code.push('var jar = request.jar();')

    var url = source.url

    source.cookies.map(function (cookie) {
      code.push(util.format('jar.setCookie(request.cookie("%s=%s"), "%s");', encodeURIComponent(cookie.name), encodeURIComponent(cookie.value), url))
    })
    code.push(null)
  }

  if (includeFS) {
    code.unshift('var fs = require("fs");')
  }

  code.push(util.format('request(%s, %s', JSON.stringify(reqOpts, null, opts.indent), 'function (error, response, body) {'))
  code.push(opts.indent + 'if (error) throw new Error(error);')
  code.push(null)
  code.push(opts.indent + 'console.log(body);')
  code.push('});')
  code.push(null)

  return code.join('\n').replace('"JAR"', 'jar').replace(/"fs\.createReadStream\(\\\"(.+)\\\"\)\"/, 'fs.createReadStream("$1")')
}

module.exports.info = {
  key: 'request',
  title: 'Request',
  link: 'https://github.com/request/request',
  description: 'Simplified HTTP request client'
}
