<template>
  <div class="forgot-password-container">
    <div class="forgot-password-form">
      <!-- 返回登录按钮 -->
      <div class="back-to-login">
        <el-button 
          type="text" 
          @click="goToLogin"
          class="back-btn"
        >
          <el-icon><ArrowLeft /></el-icon>
          返回登录
        </el-button>
      </div>

      <!-- 页面标题 -->
      <div class="forgot-password-header">
        <h2>忘记密码</h2>
        <p class="subtitle">请输入您的邮箱地址，我们将发送密码重置链接给您</p>
      </div>

      <!-- 发送邮箱步骤 -->
      <div v-if="currentStep === 1" class="step-content">
        <el-form
          ref="emailFormRef"
          :model="emailForm"
          :rules="emailRules"
          label-width="0"
          size="large"
        >
          <div class="form-group">
            <label class="form-label">邮箱地址</label>
            <el-form-item prop="email" class="form-item">
              <el-input
                v-model="emailForm.email"
                placeholder="请输入您的邮箱地址"
                :prefix-icon="User"
                :disabled="loading"
                @input="validateEmailField"
              >
                <template #suffix>
                  <el-icon v-if="emailValidation.status === 'success'" color="#67C23A">
                    <CircleCheck />
                  </el-icon>
                  <el-icon v-else-if="emailValidation.status === 'error'" color="#F56C6C">
                    <CircleClose />
                  </el-icon>
                  <el-icon v-else-if="emailValidation.loading" class="is-loading">
                    <Loading />
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>
            <div v-if="emailValidation.message" class="validation-message">
              <span :class="emailValidation.status">
                {{ emailValidation.message }}
              </span>
            </div>
          </div>

          <el-form-item>
            <el-button
              type="primary"
              class="submit-btn"
              :loading="loading"
              :disabled="!emailForm.email || emailValidation.status === 'error'"
              @click="handleSendEmail"
            >
              发送重置链接
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 邮箱发送成功步骤 -->
      <div v-else-if="currentStep === 2" class="step-content success-step">
        <div class="success-icon">
          <el-icon size="80" color="#67C23A">
            <CircleCheck />
          </el-icon>
        </div>
        <h3>邮件已发送</h3>
        <p class="success-message">
          我们已向 <strong>{{ emailForm.email }}</strong> 发送了密码重置链接
        </p>
        <p class="instruction-message">
          请检查您的邮箱（包括垃圾邮件文件夹）并点击重置链接
        </p>
        <div class="time-info">
          链接有效期为 24 小时
        </div>
        
        <div class="action-buttons">
          <el-button @click="resendEmail" :loading="resendLoading">
            重新发送
          </el-button>
          <el-button type="primary" @click="goToLogin">
            返回登录
          </el-button>
        </div>
      </div>

      <!-- 其他信息 -->
      <div class="help-info">
        <p>
          遇到问题？
          <el-button type="text" @click="showContactInfo">
            联系技术支持
          </el-button>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  ArrowLeft, 
  User, 
  CircleCheck, 
  CircleClose, 
  Loading 
} from '@element-plus/icons-vue'

// 使用认证服务
import { authService } from '@/services/auth'

const router = useRouter()

// 响应式数据
const currentStep = ref(1) // 1: 输入邮箱, 2: 发送成功
const loading = ref(false)
const resendLoading = ref(false)
const emailFormRef = ref()

// 邮箱表单
const emailForm = reactive({
  email: ''
})

// 邮箱验证状态
const emailValidation = reactive({
  status: '', // '', 'success', 'error', 'loading'
  message: '',
  loading: false
})

// 表单验证规则
const emailRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ]
}

// 实时邮箱验证
const validateEmailField = () => {
  const email = emailForm.email.trim()
  
  if (!email) {
    emailValidation.status = ''
    emailValidation.message = ''
    return
  }

  // 基本格式验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    emailValidation.status = 'error'
    emailValidation.message = '请输入有效的邮箱地址'
    return
  }

  emailValidation.status = 'success'
  emailValidation.message = '邮箱格式正确'
}

// 发送重置邮件
const handleSendEmail = async () => {
  if (!emailFormRef.value) return
  
  try {
    await emailFormRef.value.validate()
  } catch (error) {
    return
  }

  loading.value = true
  emailValidation.loading = true
  
  try {
    // 模拟发送重置邮件
    await authService.forgotPassword(emailForm.email)
    
    currentStep.value = 2
    ElMessage.success('重置链接已发送到您的邮箱')
  } catch (error: any) {
    console.error('发送重置邮件失败:', error)
    ElMessage.error(error.message || '发送重置邮件失败，请稍后重试')
  } finally {
    loading.value = false
    emailValidation.loading = false
  }
}

// 重新发送邮件
const resendEmail = async () => {
  resendLoading.value = true
  
  try {
    await authService.forgotPassword(emailForm.email)
    ElMessage.success('重置链接已重新发送')
  } catch (error: any) {
    console.error('重新发送邮件失败:', error)
    ElMessage.error(error.message || '重新发送失败，请稍后重试')
  } finally {
    resendLoading.value = false
  }
}

// 显示联系信息
const showContactInfo = () => {
  ElMessageBox.alert(
    '技术支持邮箱：support@dashboard.com<br/>工作时间：周一至周五 9:00-18:00',
    '联系技术支持',
    {
      confirmButtonText: '确定',
      dangerouslyUseHTMLString: true,
      type: 'info'
    }
  )
}

// 导航方法
const goToLogin = () => {
  router.push('/login')
}

// 页面初始化
onMounted(() => {
  // 如果有预填充的邮箱（从URL参数或其他来源）
  const urlParams = new URLSearchParams(window.location.search)
  const prefillEmail = urlParams.get('email')
  if (prefillEmail) {
    emailForm.email = prefillEmail
    validateEmailField()
  }
})
</script>

<style scoped>
.forgot-password-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
  padding: 20px;
}

.forgot-password-form {
  width: 420px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  z-index: 10;
  position: relative;
}

.back-to-login {
  margin-bottom: 32px;
}

.back-btn {
  color: #666;
  padding: 0;
  font-size: 14px;
}

.back-btn:hover {
  color: #409EFF;
}

.forgot-password-header {
  text-align: center;
  margin-bottom: 32px;
}

.forgot-password-header h2 {
  margin: 0 0 8px;
  color: #333;
  font-size: 28px;
  font-weight: 600;
}

.subtitle {
  margin: 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.step-content {
  margin-bottom: 32px;
}

.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
  font-size: 14px;
}

.form-item {
  margin-bottom: 8px;
}

.validation-message {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
}

.validation-message .success {
  color: #67C23A;
}

.validation-message .error {
  color: #F56C6C;
}

.submit-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
}

.success-step {
  text-align: center;
  padding: 40px 20px;
}

.success-icon {
  margin-bottom: 24px;
}

.success-step h3 {
  margin: 0 0 16px;
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.success-message {
  margin: 0 0 16px;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.instruction-message {
  margin: 0 0 24px;
  color: #999;
  font-size: 13px;
  line-height: 1.5;
}

.time-info {
  margin-bottom: 32px;
  padding: 12px 16px;
  background: #f0f9ff;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  color: #1e40af;
  font-size: 13px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.action-buttons .el-button {
  min-width: 120px;
}

.help-info {
  text-align: center;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #eee;
}

.help-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .forgot-password-form {
    width: 100%;
    max-width: 360px;
    padding: 30px 24px;
  }
  
  .forgot-password-header h2 {
    font-size: 24px;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .action-buttons .el-button {
    width: 100%;
  }
}

/* 动画效果 */
.success-icon {
  animation: successPulse 0.6s ease-out;
}

@keyframes successPulse {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>