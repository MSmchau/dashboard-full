<template>
  <div class="offline-container">
    <div class="offline-content">
      <div class="icon">
        <el-icon :size="120" color="#e6a23c">
          <Connection />
        </el-icon>
      </div>
      
      <h1>网络连接异常</h1>
      <p class="description">
        无法连接到服务器，请检查您的网络连接
      </p>
      
      <div class="actions">
        <el-button 
          type="primary" 
          size="large"
          @click="checkConnection"
          :loading="checking"
        >
          {{ checking ? '检查中...' : '重新连接' }}
        </el-button>
        
        <el-button 
          size="large"
          @click="goBack"
        >
          返回上一页
        </el-button>
      </div>
      
      <div class="tips">
        <h3>解决方案：</h3>
        <ul>
          <li>检查您的网络连接是否正常</li>
          <li>确认服务器是否正在运行</li>
          <li>检查防火墙设置</li>
          <li>稍后再试或联系技术支持</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Connection } from '@element-plus/icons-vue'
import { authService } from '@/services/auth'
import { apiService } from '@/services/api'

const router = useRouter()
const checking = ref(false)

const checkConnection = async () => {
  checking.value = true
  
  try {
    // 尝试ping服务器
    await apiService.request('/health', { 
      service: 'gateway',
      timeout: 5000 
    })
    
    ElMessage.success('连接恢复成功！')
    router.push('/dashboard')
  } catch (error) {
    console.error('连接检查失败:', error)
    ElMessage.error('仍然无法连接到服务器')
  } finally {
    checking.value = false
  }
}

const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/login')
  }
}
</script>

<style scoped>
.offline-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px;
}

.offline-content {
  max-width: 500px;
  text-align: center;
  background: white;
  padding: 60px 40px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.icon {
  margin-bottom: 24px;
}

h1 {
  margin: 0 0 16px;
  color: #333;
  font-size: 32px;
  font-weight: 600;
}

.description {
  margin: 0 0 32px;
  color: #666;
  font-size: 16px;
  line-height: 1.5;
}

.actions {
  margin-bottom: 40px;
}

.actions .el-button {
  margin: 0 8px;
}

.tips {
  text-align: left;
  background: #f8f9fa;
  padding: 24px;
  border-radius: 8px;
  border-left: 4px solid #e6a23c;
}

.tips h3 {
  margin: 0 0 12px;
  color: #333;
  font-size: 16px;
}

.tips ul {
  margin: 0;
  padding-left: 20px;
  color: #666;
}

.tips li {
  margin: 8px 0;
  line-height: 1.4;
}

@media (max-width: 480px) {
  .offline-content {
    padding: 40px 20px;
    margin: 20px;
  }
  
  h1 {
    font-size: 28px;
  }
  
  .actions .el-button {
    display: block;
    width: 100%;
    margin: 8px 0;
  }
}
</style>