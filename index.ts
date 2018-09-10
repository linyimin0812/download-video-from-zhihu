import { download } from './download'

import path from 'path'
import fs from 'fs'
import express from 'express'

import { log } from 'brolog'

// video directory
const VIDEO_DIR = path.join(
  __dirname,
  path.sep,
  'public',
  path.sep,
  'video',
  path.sep,
)
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
  const url  = req.query.url
  const name = req.query.name
  download(url, name).then(videoName => {
    let currentFile = `${VIDEO_DIR}${videoName}`
    log.info('index', '/download %s', currentFile)
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
    log.error('index', '/download fail %s', JSON.stringify(err))
    res.statusCode = 500
    res.end()
  })
})

app.get('/video', (req, res) => {
  const videoName = req.query.name
  log.info('index', '/video %s', videoName)
  const videoPath = `${VIDEO_DIR}${videoName}`
  const videoState = fs.statSync(videoPath)
  // video file's size
  const videoSize = videoState.size
  let range = req.headers.range
  range = Array.isArray(range) ? range[0] : range
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : videoSize - 1
    const chunkSize = (end - start) + 1
    const file = fs.createReadStream(videoPath, {start, end})
    const head = {
      // https://stackoverflow.com/questions/41521272/html5-video-element-not-requesting-end-range
      // https://stackoverflow.com/questions/48156306/html-5-video-tag-range-header
      'Content-Range': `bytes ${start}-${end}/${videoSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    }
    res.writeHead(206, head)
    file.pipe(res)
  } else {
    const head = {
      'Content-Length': videoSize,
      'Content-Type'  : 'video/mp4',
    }
    res.writeHead(200, head)
    fs.createReadStream(videoPath).pipe(res)
  }
})

app.listen(8000, () => {
  log.info('index', 'listen port 8000')
})
