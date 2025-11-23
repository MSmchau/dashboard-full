<template>
  <div class="reset-password-container">
    <div class="reset-password-form">
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
      <div class="reset-password-header">
        <h2>重置密码</h2>
        <p class="subtitle">请输入您的新密码</p>
      </div>

      <!-- 验证令牌步骤 -->
      <div v-if="currentStep === 1" class="step-content">
        <div class="token-verification">
          <div class="token-icon">
            <el-icon size="60" color="#409EFF">
              <Lock />
            </el-icon>
          </div>
          <p class="token-message">
            正在验证重置令牌...
          </p>
          <div v-if="verificationLoading" class="loading-container">
            <el-icon class="is-loading" size="24">
              <Loading />
            </el-icon>
          </div>
          <div v-else-if="verificationError" class="error-container">
            <p class="error-message">{{ verificationError }}</p>
            <el-button @click="goToLogin" type="primary">
              返回登录
            </el-button>
          </div>
        </div>
      </div>

      <!-- 重置密码步骤 -->
      <div v-else-if="currentStep === 2" class="step-content">
        <el-form
          ref="passwordFormRef"
          :model="passwordForm"
          :rules="passwordRules"
          label-width="0"
          size="large"
        >
          <div class="form-group">
            <label class="form-label">新密码</label>
            <el-form-item prop="password" class="form-item">
              <el-input
                v-model="passwordForm.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入新密码"
                :prefix-icon="Lock"
                :disabled="loading"
              >
                <template #suffix>
                  <el-icon 
                    @click="togglePasswordVisibility"
                    class="password-toggle"
                  >
                    <View v-if="!showPassword" />
                    <Hide v-if="showPassword" />
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>
            <div class="password-strength">
              <div class="strength-label">密码强度:</div>
              <div class="strength-indicator">
                <div 
                  v-for="(bar, index) in passwordStrength.bars" 
                  :key="index"
                  class="strength-bar"
                  :class="bar"
                ></div>
              </div>
              <span class="strength-text" :class="passwordStrength.level">
                {{ passwordStrength.text }}
              </span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">确认新密码</label>
            <el-form-item prop="confirmPassword" class="form-item">
              <el-input
                v-model="passwordForm.confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="请再次输入新密码"
                :prefix-icon="Lock"
                :disabled="loading"
              >
                <template #suffix>
                  <el-icon 
                    @click="toggleConfirmPasswordVisibility"
                    class="password-toggle"
                  >
                    <View v-if="!showConfirmPassword" />
                    <Hide v-if="showConfirmPassword" />
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>
          </div>

          <div class="password-requirements">
            <h4>密码要求:</h4>
            <ul>
              <li :class="{ 'met': passwordStrengthChecks.hasLength }">
                <el-icon><CircleCheck v-if="passwordStrengthChecks.hasLength" /><CircleClose v-else /></el-icon>
                长度至少8个字符
              </li>
              <li :class="{ 'met': passwordStrengthChecks.hasLowerCase }">
                <el-icon><CircleCheck v-if="passwordStrengthChecks.hasLowerCase" /><CircleClose v-else /></el-icon>
                包含小写字母
              </li>
              <li :class="{ 'met': passwordStrengthChecks.hasUpperCase }">
                <el-icon><CircleCheck v-if="passwordStrengthChecks.hasUpperCase" /><CircleClose v-else /></el-icon>
                包含大写字母
              </li>
              <li :class="{ 'met': passwordStrengthChecks.hasNumber }">
                <el-icon><CircleCheck v-if="passwordStrengthChecks.hasNumber" /><CircleClose v-else /></el-icon>
                包含数字
              </li>
              <li :class="{ 'met': passwordStrengthChecks.hasSpecialChar }">
                <el-icon><CircleCheck v-if="passwordStrengthChecks.hasSpecialChar" /><CircleClose v-else /></el-icon>
                包含特殊字符
              </li>
            </ul>
          </div>

          <el-form-item>
            <el-button
              type="primary"
              class="submit-btn"
              :loading="loading"
              :disabled="!isFormValid"
              @click="handleResetPassword"
            >
              更新密码
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 重置成功步骤 -->
      <div v-else-if="currentStep === 3" class="step-content success-step">
        <div class="success-icon">
          <el-icon size="80" color="#67C23A">
            <CircleCheck />
          </el-icon>
        </div>
        <h3>密码重置成功</h3>
        <p class="success-message">
          您的密码已成功更新
        </p>
        <p class="instruction-message">
          您现在可以使用新密码登录您的账户
        </p>
        
        <el-button type="primary" @click="goToLogin" class="login-btn">
          前往登录
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  ArrowLeft,
  Lock,
  View,
  Hide,
  Loading,
  CircleCheck,
  CircleClose
} from '@element-plus/icons-vue'

// 使用认证服务
import { authService } from '@/services/auth'

const router = useRouter()
const route = useRoute()

// 响应式数据
const currentStep = ref(1) // 1: 验证令牌, 2: 重置密码, 3: 重置成功
const loading = ref(false)
const verificationLoading = ref(true)
const verificationError = ref('')

// 表单引用
const passwordFormRef = ref()

// 密码表单
const passwordForm = reactive({
  password: '',
  confirmPassword: ''
})

// 密码可见性
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// 密码强度计算
const passwordStrength = computed(() => {
  const password = passwordForm.password
  const bars = ['', '', '', '']
  let level = ''
  let text = ''

  if (password.length === 0) {
    return { bars, level, text }
  }

  let strength = 0
  
  // 长度检查 (25%)
  if (password.length >= 8) strength += 25
  
  // 包含小写字母 (25%)
  if (/[a-z]/.test(password)) strength += 25
  
  // 包含大写字母 (25%)
  if (/[A-Z]/.test(password)) strength += 25
  
  // 包含数字或特殊字符 (25%)
  if (/[0-9]/.test(password) || /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 25

  // 设置强度条
  for (let i = 0; i < Math.floor(strength / 25); i++) {
    bars[i] = 'active'
  }

  // 设置强度等级和文本
  if (strength < 50) {
    level = 'weak'
    text = '弱'
  } else if (strength < 75) {
    level = 'medium'
    text = '中等'
  } else {
    level = 'strong'
    text = '强'
  }

  return { bars, level, text }
})

// 密码强度检查项
const passwordStrengthChecks = computed(() => {
  const password = passwordForm.password
  return {
    hasLength: password.length >= 8,
    hasLowerCase: /[a-z]/.test(password),
    hasUpperCase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  }
})

// 表单验证规则
const passwordRules = {
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 8, max: 20, message: '密码长度应在8-20个字符之间', trigger: 'blur' },
    { 
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/,
      message: '密码必须包含大小写字母、数字和特殊字符',
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule: any, value: string, callback: any) => {
        if (value !== passwordForm.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 表单有效性检查
const isFormValid = computed(() => {
  const password = passwordForm.password
  const confirmPassword = passwordForm.confirmPassword
  
  return password.length >= 8 && 
         /[a-z]/.test(password) && 
         /[A-Z]/.test(password) && 
         /[0-9]/.test(password) && 
         /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) &&
         password === confirmPassword
})

// 切换密码可见性
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const toggleConfirmPasswordVisibility = () => {
  showConfirmPassword.value = !showConfirmPassword.value
}

// 验证重置令牌
const verifyResetToken = async () => {
  const token = route.query.token as string
  
  if (!token) {
    verificationError.value = '无效的重置链接'
    verificationLoading.value = false
    return
  }

  try {
    // 这里可以添加令牌验证逻辑
    // await authService.verifyResetToken(token)
    
    // 模拟验证过程
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 令牌验证成功，进入重置密码步骤
    currentStep.value = 2
  } catch (error: any) {
    console.error('令牌验证失败:', error)
    verificationError.value = '重置链接已过期或无效'
  } finally {
    verificationLoading.value = false
  }
}

// 重置密码
const handleResetPassword = async () => {
  if (!passwordFormRef.value) return
  
  try {
    await passwordFormRef.value.validate()
  } catch (error) {
    return
  }

  loading.value = true
  
  try {
    const token = route.query.token as string
    await authService.resetPassword(token, passwordForm.password)
    
    currentStep.value = 3
    ElMessage.success('密码重置成功')
  } catch (error: any) {
    console.error('密码重置失败:', error)
    ElMessage.error(error.message || '密码重置失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 导航方法
const goToLogin = () => {
  router.push('/login')
}

// 页面初始化
onMounted(() => {
  verifyResetToken()
})
</script>

<style scoped>
.reset-password-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
  padding: 20px;
}

.reset-password-form {
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

.reset-password-header {
  text-align: center;
  margin-bottom: 32px;
}

.reset-password-header h2 {
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

/* 令牌验证样式 */
.token-verification {
  text-align: center;
  padding: 40px 20px;
}

.token-icon {
  margin-bottom: 24px;
}

.token-message {
  margin: 0 0 24px;
  color: #666;
  font-size: 16px;
}

.loading-container {
  margin-bottom: 24px;
}

.error-container {
  text-align: center;
}

.error-message {
  margin: 0 0 24px;
  color: #F56C6C;
  font-size: 14px;
}

/* 表单样式 */
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

.password-toggle {
  cursor: pointer;
  padding: 4px;
}

.password-toggle:hover {
  color: #409EFF;
}

/* 密码强度指示器 */
.password-strength {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.strength-label {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.strength-indicator {
  display: flex;
  gap: 4px;
}

.strength-bar {
  width: 20px;
  height: 4px;
  background: #e4e7ed;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.strength-bar.active {
  background: #409EFF;
}

.strength-bar.active.medium {
  background: #E6A23C;
}

.strength-bar.active.strong {
  background: #67C23A;
}

.strength-text {
  font-size: 12px;
  font-weight: 500;
  min-width: 30px;
}

.strength-text.weak {
  color: #F56C6C;
}

.strength-text.medium {
  color: #E6A23C;
}

.strength-text.strong {
  color: #67C23A;
}

/* 密码要求列表 */
.password-requirements {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.password-requirements h4 {
  margin: 0 0 12px;
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

.password-requirements ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.password-requirements li {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: #666;
  font-size: 13px;
  transition: color 0.3s ease;
}

.password-requirements li:last-child {
  margin-bottom: 0;
}

.password-requirements li.met {
  color: #67C23A;
}

.password-requirements .el-icon {
  font-size: 14px;
}

.submit-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
}

/* 成功页面样式 */
.success-step {
  text-align: center;
  padding: 40px 20px;
}

.success-icon {
  margin-bottom: 24px;
  animation: successPulse 0.6s ease-out;
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
  font-size: 16px;
  font-weight: 500;
}

.instruction-message {
  margin: 0 0 32px;
  color: #999;
  font-size: 14px;
  line-height: 1.5;
}

.login-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .reset-password-form {
    width: 100%;
    max-width: 360px;
    padding: 30px 24px;
  }
  
  .reset-password-header h2 {
    font-size: 24px;
  }
  
  .password-strength {
    flex-wrap: wrap;
  }
}

/* 动画效果 */
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

.is-loading {
  animation: rotation 2s linear infinite;
}

@keyframes rotation {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>