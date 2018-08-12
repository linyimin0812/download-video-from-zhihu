import { download } from './download'

import path from 'path'
import fs from 'fs'
import express from 'express'
import axios from 'axios'

const app = express()
app.use(function (req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Pass to next layer of middleware
  next();
})

app.use(express.static('public'))
// https://www.zhihu.com/question/279039888/answer/463839657
app.get('/download', async (req, res) => {
  const url = req.query.url
  const name = req.query.name
  download(url, name).then(videoName => {
    const videoDir = path.join(
      __dirname,
      path.sep,
      'public',
      path.sep,
      'video',
      path.sep,
    )

    let currentFile = `${videoDir}${videoName}`
    console.log(currentFile)
    fs.exists(currentFile, function (exists) {
      if (exists) {
        res.download(currentFile)
      } else {
        res.set("Content-type", "text/html")
        res.send("file not exist!")
        res.end()
      }
    })
  }).catch(err => {
    console.log(err)
    res.statusCode = 500
    res.end()
  })
})

app.listen(8000, () => {
  console.log('listen port 8000')
})
