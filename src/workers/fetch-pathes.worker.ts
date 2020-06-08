import fs from 'fs'
import path from 'path'

const ctx: Worker = self as any

ctx.addEventListener('message', ({ data: { key, path: dirPath } }) => {
  const filePathes = fs.readdirSync(dirPath).reduce((carry, filename) => {
    if (filename.match(/^\./)) {
      return carry
    }
    return [...carry, path.join(dirPath, filename)]
  }, [] as string[])
  ctx.postMessage({ key, data: filePathes })
})
