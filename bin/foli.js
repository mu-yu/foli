#!/usr/bin/env node

const path = require('path')
const fs = require('fs-extra')
const program = require('commander')
const chalk = require('chalk')

const currentFolder = process.cwd()

program
  .version(require('../package').version)
  .option('-d, --destination <destPath>', '/path/to/destination/')
  .option('-s, --source [sourcePath]',  '/path/to/source default: current folder', currentFolder)
  .option('-b, --backup [backupPath]', '/path/to/backup/ default:  --destination')
  .parse(process.argv)

if (!process.argv.slice(2).length) {
  program.outputHelp()
  process.exit(0)
}

let {source, destination, backup} = program
if (!destination) {
  console.error(`Required param ${chalk.yellow('--destination')} not set.`)
  program.outputHelp()
  process.exit(-1)
}

// 将参数转化为绝对目录
source = path.isAbsolute(source) ? source : path.resolve(currentFolder, source)
destination = path.isAbsolute(destination) ? destination: path.resolve(currentFolder, destination)
backup = !backup
  ? path.resolve(destination, 'foli.backup')
  : path.isAbsolute(backup) ? backup : path.resolve(currentFolder, backup)
fs.ensureDir(backup)


fs.readdir(source).then(menu => {
  Promise.all(menu.map(async file => {
    const fromPath = path.resolve(source, file)
    const toPath = path.resolve(destination, file)
    const backupPath = path.resolve(backup, file)

    const stats = await fs.stat(fromPath)
    const linkType = stats.isDirectory() ? 'dir' : 'file'
    try {
      // destination 中已经存在的文件备份到 backup 目录再创建链接
      await fs.access(toPath)
      await fs.move(toPath, backupPath, {overwrite: true})
    } catch(e) {
      // destination 中不存在的文件
    } finally {
      await fs.ensureSymlink(fromPath, toPath, linkType)
      console.log(`Make symlink from ${chalk.blue(fromPath)} to ${chalk.cyan(toPath)}`)
    }
  })).then(async () => {
    const files = await fs.readdir(backup)
    if (!files.length) {
      fs.remove(backup)
    }
  })
})
