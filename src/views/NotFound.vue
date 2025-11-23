<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <div class="error-code">404</div>
      
      <h1>页面未找到</h1>
      <p class="description">
        抱歉，您访问的页面不存在或已被移除
      </p>
      
      <div class="actions">
        <el-button 
          type="primary" 
          size="large"
          @click="goHome"
        >
          返回首页
        </el-button>
        
        <el-button 
          size="large"
          @click="goBack"
        >
          返回上一页
        </el-button>
      </div>
      
      <div class="help-info">
        <h3>可能的原因：</h3>
        <ul>
          <li>页面已被删除或移动</li>
          <li>URL地址输入错误</li>
          <li>权限不足，无法访问此页面</li>
          <li>会话已过期，请重新登录</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { authService } from '@/services/auth'

const router = useRouter()

const goHome = () => {
  if (authService.isLoggedIn) {
    router.push('/dashboard')
  } else {
    router.push('/login')
  }
}

const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    goHome()
  }
}
</script>

<style scoped>
.not-found-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px;
}

.not-found-content {
  max-width: 500px;
  text-align: center;
  background: white;
  padding: 60px 40px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.error-code {
  font-size: 120px;
  font-weight: bold;
  color: #e6a23c;
  line-height: 1;
  margin-bottom: 16px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

h1 {
  margin: 0 0 16px;
  color: #333;
  font-size: 28px;
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

.help-info {
  text-align: left;
  background: #f8f9fa;
  padding: 24px;
  border-radius: 8px;
  border-left: 4px solid #e6a23c;
}

.help-info h3 {
  margin: 0 0 12px;
  color: #333;
  font-size: 16px;
}

.help-info ul {
  margin: 0;
  padding-left: 20px;
  color: #666;
}

.help-info li {
  margin: 8px 0;
  line-height: 1.4;
}


</style>