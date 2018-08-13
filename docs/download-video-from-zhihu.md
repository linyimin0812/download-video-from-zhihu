# 下载知乎视频并在线播放

## 下载知乎视频

 	知乎的视频使用HLS实时流传输协议进行传输.HLS，Http Live Streaming 是由Apple公司定义的用于实时流传输的协议，HLS基于HTTP协议实现，传输内容包括两部分，一是M3U8描述文件，二是TS媒体文件。

1、M3U8文件

   用文本方式对媒体文件进行描述，由一系列标签组成。

```m3u8
#EXTM3U

#EXT-X-TARGETDURATION:5

#EXTINF:5,

./0.ts

#EXTINF:5,

./1.ts

#EXTM3U：每个M3U8文件第一行必须是这个tag。

#EXT-X-TARGETDURATION：指定最大的媒体段时间长度（秒），#EXTINF中指定的时间长度必须小于或等于这个最大值。该值只能出现一次。

#EXTINF：描述单个媒体文件的长度。后面为媒体文件，如./0.ts 

```

2、[ts文件](https://my.oschina.net/u/727148/blog/666824)

​    ts文件为传输流文件，视频编码主要格式h264/mpeg4，音频为acc/MP3。

### 获取答案中的视频链接

知乎视频链接的格式`https://www.zhihu.com/video/984740889473818624`

1. 访问答案链接,获取链接对应的html文件内容

   ```typescript
   import request from 'request-promise'
   import unescape from 'unescape'
   const TARGET_VIDEO_DIR = `${__dirname}/public/video`
   ```

2. 使用正则表达式获取视频链接

   ```typescript
   const rex = />(https:\/\/www.zhihu.com\/video\/([0-9]+))</
   const matchResult = content.match(rex)
   if (!matchResult) {
     throw new Error('there is not video exist')
   }
   // https://www.zhihu.com/video/984740889473818624 
   const videoUrl = matchResult[1]
   // 984740889473818624
   const videoHash = matchResult[2]
   ```

### 下载视频链接中对应的m3u8和ts文件

​	访问获取到的视频链接https://www.zhihu.com/video/984740889473818624, 使用F12查看具体的访问过程,可以发现,知乎对此视频链接的处理如下:

1. 请求`https://lens.zhihu.com/api/videos/984740889473818624`,获取播放列表,结果如下:

   ```json
   {
   "playlist":{
   "ld":{"width": 640, "format": "m3u8", "play_url": "https://vdn.vzuu.com/Act-ss-m3u8-ld/4d2f1b27a0a0417c937af38548310006/135ba0d0-62e7-11e8-8574-0242ac112a1f.m3u8?auth_key=1534147563-0-0-bb23f2e6455b894f0aa1d216afbc0a12&expiration=1534147563&disable_local_cache=0",…},
   "hd":{"width": 1280, "format": "m3u8", "play_url": "https://vdn.vzuu.com/Act-ss-m3u8-hd/4d2f1b27a0a0417c937af38548310006/135ba0d0-62e7-11e8-8574-0242ac112a1f.m3u8?auth_key=1534147563-0-0-a0797a8a37c6b316ece393d89a213978&expiration=1534147563&disable_local_cache=0",…},
   "sd":{"width": 848, "format": "m3u8", "play_url": "https://vdn.vzuu.com/Act-ss-m3u8-sd/4d2f1b27a0a0417c937af38548310006/135ba0d0-62e7-11e8-8574-0242ac112a1f.m3u8?auth_key=1534147563-0-0-d92ae153e7730835c684202afa3da9d8&expiration=1534147563&disable_local_cache=0",…}
   },
   "title": "",
   "duration": 19,
   "cover_info":{
   "width": 1280,
   "thumbnail": "https://pic3.zhimg.com/80/v2-73bb3006d2228ce55d6aade8975e0ade_b.jpg",
   "height": 2258
   },
   "type": "video",
   "id": "984740889473818624",
   "misc_info":{}
   }
   ```

2. 选择playlist中的某一个列别,使用play_url下载所有ts文件病进行播放

   ![](https://github.com/linyimin-bupt/download-video-from-zhihu/blob/master/docs/play_url.png)

   根据以上的步骤,编写实现代码

   1. 调用`https://lens.zhihu.com/api/videos/984740889473818624`获取play_url

   ```typescript
   const vidoesApi = `https://lens.zhihu.com/api/videos/${videoHash}`
   // get m3u8 url, just need to get one, and tsFetcher will download all ts files
   const m3u8Url = JSON.parse(await request(vidoesApi)).playlist.hd.play_url
   ```

   2. 从play_url下载所有TS文件(使用download-m3u8依赖完成下载)

      ```shell
      npm install -g download-m3u8
      # simply pass a http link to a m3u8 playlist 
      download-m3u8 https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8
      ```

      为了能在程序中自动下载使用child_process中的execSync完成shell命令的调用

      ```typescript
      import { execSync } from 'child_process'
      execSync(`download-m3u8 ${m3u8Url}`)
      console.log('download all ts files done.')
      ```

      ![下载的文件](https://github.com/linyimin-bupt/download-video-from-zhihu/blob/master/docs/tsfiles.png)
      
      
      至此,所有的ts相关的文件都会保存在`./{http-host}/{filename}`

### 将所有的ts 文件合并成一个大的ts文件

ts文件是以二进制的格式进行存储, 可以以二进制合并的方式直接将所有小的ts文件合并成一个大的ts文件,在linux系统下可以使用cat命令直接完成.

```typescript
// Get all ts file
const tsFiles = fs.readdirSync(videoDir).filter((value) => {
    return 'ts' === value.split('.')[1]
})
const sourceFiles = tsFiles.join(' ')
execSync(`cat ${sourceFiles} > ${videoDir}/${name}.ts`)
console.log('merge ts files done.')
```

### 将ts文件转成MP4格式的视频文件

将ts文件转换成mp4的工作可以使用`mpegts_to_mp4`依赖包完成

```typescript
import mpegts_to_mp4 from 'mpegts_to_mp4'
mpegts_to_mp4(tsFileName, 'test.mp4', async (err) => {
  if(err){
      console.log("Error: "+err)
  }
  // remove all ts files
  const downloadRootDir = path.join(videoDir, '../', '../')
  await rimraf_then(downloadRootDir)
  console.log("Done converting vids.")
})
```

## html5和Nodejs使用视频流在线播放

### 基本知识

#### HTTP status 206(Partial Content)

在传输大容量数据时,通过将数据分分割成多块,让浏览器逐步显示.需要在响应头设置相关信息:

```
'Content-Range': 'bytes chunkStart-chunkEnd/chunkSize'
'Accept-Ranges': 'bytes'
'Content-Length': chunkSize
'Content-Type': 'video/mp4'
```

浏览器在请求视频时会自动设置所需的ranges,所以后台需要获取请求头部的ranges信息,返回指定范围的数据

- 5001-10000字节

```
Range: bytes=5001-10000
```

- 从5001字节之后的所有数据

```
Range: bytes=5001-
```

### 后台实现

```typescript
  app.get('/video', (req, res) => {
  const videoName = req.query.name
  console.log('name', videoName)
  console.log(req.headers)
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
      'Content-Type': 'video/mp4',
    }
    res.writeHead(200, head)
    fs.createReadStream(videoPath).pipe(res)
  }
})
```



### 前端的简单实现

```html
<video id="videoPlayer" controls>
  <source src="http://localhost:3000/video" type="video/mp4">
</video>
```

致此,完成简单的知乎视频下载播放的功能.



# 其他

## html自动加载视频

```html
<video id="videoPlayer" controls>
  <source src="http://localhost:3000/video" type="video/mp4">
</video>
```

```javascript
const myVideo = document.getElementsByTagName('video')[0]
myVideo.src = `http://${HOST}:${PORT}/video?name=${videoName}`
myVideo.load()
myVideo.play()
```

## axios下载视频

### 后台实现

```typescript
app.get('/download', async (req, res) => {
const url = req.query.url
const name = req.query.name
download(url, name).then(videoName => {
  let currentFile = `${VIDEO_DIR}${videoName}`
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
```

### 前段实现

```typescript
// Download the files
const url = window.URL.createObjectURL(new Blob([response.data]))
const link = document.createElement('a')
link.href = url
link.setAttribute('download', videoName)
document.body.appendChild(link)
link.click()
```

