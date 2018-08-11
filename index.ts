import { download } from './download'

import express from 'express'

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
  try {
    const videoName = await download(url, name)
    res.send('http://localhost:8000/video/' + videoName)
  } catch (err) {
    console.log(err)
    res.statusCode = 500
    res.end()
  }
})

app.listen(8000, () => {
  console.log('listen port 8000')
})
