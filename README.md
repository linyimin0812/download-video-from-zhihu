1. Insstall download-m3u8 globally
```
npm i -g download-m3u8
```

2. Install dependencies
```
npm install
```

3. Config: Specify the host and port
```
$ cd download-video-from-zhihu
$ vim public/url.js

#Specify the information
const HOST = 'localhost'
const PORT = 8000
```

4. Run the code
```
ts-node index.ts
```

5. Visit the download page
```
http:localhost:8000
```
