// 列出element-plus图标库中所有可用的图标名称
import * as ElIcon from '@element-plus/icons-vue'

console.log('Available icons in @element-plus/icons-vue:')
Object.keys(ElIcon).forEach(iconName => {
  console.log(iconName)
})