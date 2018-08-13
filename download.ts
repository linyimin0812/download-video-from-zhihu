// the source link: https://www.zhihu.com/question/276140235/answer/404172747

// the zhihu video link example
// https://www.zhihu.com/video/984740889473818624 ---> https://lens.zhihu.com/api/videos/984740889473818624

import request from 'request-promise'
import unescape from 'unescape'
import fs from 'fs'
import path from 'path'
import rimraf_then from 'rimraf-then'

import mpegts_to_mp4 from 'mpegts_to_mp4'

import { execSync } from 'child_process'

import url from 'url'
import cuid from 'cuid'

const TARGET_VIDEO_DIR = `${__dirname}/public/video`
// 1. get the url who want to contains the target video
const rex = />https:\/\/www.zhihu.com\/video\/([0-9]+)</
async function getM3u8BaseUrl(url: string): Promise<string> {
  try {
    const content: string = unescape(await request(url), '')
    const matchResult = content.match(rex)
    if (!matchResult) {
      throw new Error('there is not video exist')
    }
    /**
     *{
     *  "playlist": {
     *    "ld": {
     *      "width": 640,
     *      "format": "m3u8",
     *      "play_url": "https://vdn.vzuu.com/Act-ss-m3u8-ld/43aa60b88c084c5095a913e3be0433f4/e7d6c4ac-ba6d-11e7-a60a-0242ac112a0dNone.m3u8?auth_key=1533821109-0-0-484802f56d5fce971ee0686cb60a39f7&expiration=1533821109&disable_local_cache=0",
     *      "duration": 216,
     *      "size": 13958436,
     *      "bitrate": 516,
     *      "height": 360
     *    },
     *    "hd": {
     *      "width": 1280,
     *      "format": "m3u8",
     *      "play_url": "https://vdn.vzuu.com/Act-ss-m3u8-hd/43aa60b88c084c5095a913e3be0433f4/e7d6c4ac-ba6d-11e7-a60a-0242ac112a0dNone.m3u8?auth_key=1533821109-0-0-c166092c393bc797be996ffbbaffffa9&expiration=1533821109&disable_local_cache=0",
     *      "duration": 216,
     *      "size": 54715708,
     *      "bitrate": 2026,
     *      "height": 720
     *    },
     *    "sd": {
     *      "width": 848,
     *      "format": "m3u8",
     *      "play_url": "https://vdn.vzuu.com/Act-ss-m3u8-sd/43aa60b88c084c5095a913e3be0433f4/e7d6c4ac-ba6d-11e7-a60a-0242ac112a0dNone.m3u8?auth_key=1533821109-0-0-9829d22a76162e650b2979d952f956e2&expiration=1533821109&disable_local_cache=0",
     *      "duration": 216,
     *      "size": 25564992,
     *      "bitrate": 946,
     *      "height": 478
     *    }
     *  },
     *  "title": "",
     *  "duration": 216,
     *" cover_info": {
     *    "width": 1280,
     *    "thumbnail": "https://pic2.zhimg.com/80/v2-50e2609974e3e2cd404ca671dd44f095_b.jpg",
     *    "height": 720
     *  },
     *  "type": "video",
     *  "id": "907046285092220928",
     *  "misc_info": {}
     *}
     */
    const vidoesApi = `https://lens.zhihu.com/api/videos/${matchResult[1]}`
    // get m3u8 url, just need to get one, and tsFetcher will download all ts files
    const m3u8Url = JSON.parse(await request(vidoesApi)).playlist.hd.play_url
    return m3u8Url
  } catch(err) {
    throw err
  }
}

// 2. download all segments of a m3u8 files
// need to install download-m3u8 -g
// cnpm install -g download-m3u8

async function downloadTsFiles(sourceUrl: string) {
  const m3u8Url = await getM3u8BaseUrl(sourceUrl)
  execSync(`download-m3u8 ${m3u8Url}`)
  console.log('download all ts files done.')
}

// 3. merge ts files
async function mergeTsFiles(sourceUrl: string, name: string) {
  const videoDir = await getVideoDir(sourceUrl)
  const tsFiles = await getAllTsFile(sourceUrl)
  for (let i = 0; i < tsFiles.length; i++) {
    tsFiles[i]  = `${videoDir}/${tsFiles[i]}`
  }
  /**
   * merge all ts files
   * use binary copy to merge the ts file(https://blog.csdn.net/peng790/article/details/52266751)
   * in linux, we use cat command to realise binary copy(https://stackoverflow.com/questions/10347278/how-can-i-copy-several-binary-files-into-one-file-on-a-linux-system)
   */
  // source file
  const sourceFiles = tsFiles.join(' ')
  execSync(`cat ${sourceFiles} > ${videoDir}/${name}.ts`)
  console.log('merge ts files done.')
  
}

// tranfer ts file to mp4 file

async function convertTSFilesToMp4(sourceUrl: string, name: string): Promise<string> {
  const videoDir = await getVideoDir(sourceUrl)
  const tsFile = `${videoDir}/${name}.ts`
  if (! fs.existsSync(TARGET_VIDEO_DIR)) {
    fs.mkdirSync(TARGET_VIDEO_DIR)
  }
  
  let videoName = path.basename(tsFile, '.ts')+'.mp4'
  // if the video name has existed, then rename it
  if(fs.existsSync(TARGET_VIDEO_DIR + '/' + videoName)) {
    videoName = cuid() + '.mp4'
    console.log(`${name}.mp4 has exists, we have renamed the video with ${videoName}`)
  }
  try {
    await mpegtsToMp4(tsFile, videoDir, videoName)
    return videoName
  } catch (err) {
    console.log(err)
    throw new Error('there is some thing error')
  }
}

async function getAllTsFile(sourceUrl: string): Promise<string[]> {
  const m3u8Url = await getM3u8BaseUrl(sourceUrl) 
  const myUrl = url.parse(m3u8Url)
  const host = myUrl.host
  if (!myUrl.pathname) {
    throw new Error('Please input a valid video link from zhihu')
  }
  const pathname = myUrl.pathname.slice(0, myUrl.pathname.lastIndexOf('/'))
  const videoDir = `${__dirname}/${host}${pathname}`
  const tsFiles = fs.readdirSync(videoDir).filter((value) => {
    return 'ts' === value.split('.')[1]
  })
  return tsFiles
}

async function getVideoDir(sourceUrl: string): Promise<string> {
  const m3u8Url = await getM3u8BaseUrl(sourceUrl) 
  const myUrl = url.parse(m3u8Url)
  const host = myUrl.host
  if (!myUrl.pathname) {
    throw new Error('Please input a valid video link from zhihu')
  }
  const pathname = myUrl.pathname.slice(0, myUrl.pathname.lastIndexOf('/'))
  const videoDir = `${__dirname}/${host}${pathname}`
  return videoDir
}

async function mpegtsToMp4(tsFileName: string, videoDir: string, videoName: string): Promise<string> {
  return new Promise<string> ((resolve, reject) => {
    mpegts_to_mp4(tsFileName, TARGET_VIDEO_DIR + '/' + videoName, async (err) => {
      if(err){
          console.log("Error: "+err)
      }
      // remove all ts files
      const downloadRootDir = path.join(videoDir, '../', '../')
      await rimraf_then(downloadRootDir)
      console.log("Done converting vids.")
      resolve(videoName)
    })
  })
}

/**
 * download video from zhihu
 * @param url: the page who contains the video 
 * @param name: specify a name for the downloaded video
 */
export async function download(url: string, name?: string): Promise<string> {
  name = name || cuid()
  await downloadTsFiles(url)
  await mergeTsFiles(url, name)
  return await convertTSFilesToMp4(url, name)
}