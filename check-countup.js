// 检查vue3-countup模块的导出
import * as CountUpModule from 'vue3-countup'

console.log('Available exports in vue3-countup:')
Object.keys(CountUpModule).forEach(exportName => {
  console.log(exportName)
})