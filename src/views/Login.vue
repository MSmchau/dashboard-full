<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h2 class="login-title">欢迎登录</h2>
        <p class="login-subtitle">请输入您的用户名或邮箱和密码</p>
      </div>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <!-- 用户名或邮箱输入 -->
        <el-form-item prop="username" class="form-item">
          <div class="input-container">
            <el-input
              v-model="loginForm.username"
              placeholder="用户名或邮箱"
              size="large"
              :prefix-icon="User"
              clearable
              @blur="validateUsername"
              @input="handleUsernameInput"
            />
            
            <!-- 验证状态指示器 -->
            <div v-if="usernameValidation.loading" class="validation-loading">
              <el-icon class="is-loading"><Loading /></el-icon>
            </div>
            <div v-else-if="usernameValidation.status === 'valid'" class="validation-success">
              <el-icon color="#67C23A"><CircleCheck /></el-icon>
            </div>
            <div v-else-if="usernameValidation.status === 'invalid'" class="validation-error">
              <el-icon color="#F56C6C"><CircleClose /></el-icon>
            </div>
          </div>
          
          <!-- 验证消息 -->
          <div v-if="usernameValidation.message" class="validation-message" :class="usernameValidation.status">
            {{ usernameValidation.message }}
          </div>
        </el-form-item>

        <!-- 密码输入 -->
        <el-form-item prop="password" class="form-item">
          <div class="input-container">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="密码"
              size="large"
              :prefix-icon="Lock"
              show-password
              clearable
              @input="handlePasswordInput"
            />
            
            <!-- 密码强度指示器 -->
            <div v-if="passwordValidation.loading" class="validation-loading">
              <el-icon class="is-loading"><Loading /></el-icon>
            </div>
            <div v-else-if="passwordValidation.score > 0" class="password-strength">
              <div class="strength-bars">
                <div 
                  v-for="n in 4" 
                  :key="n"
                  class="strength-bar"
                  :class="{ active: n <= passwordValidation.score }"
                />
              </div>
            </div>
          </div>
          
          <!-- 密码强度消息 -->
          <div v-if="passwordValidation.message" class="validation-message" :class="passwordValidation.status">
            {{ passwordValidation.message }}
          </div>
        </el-form-item>

        <!-- 记住我和忘记密码 -->
        <div class="form-options">
          <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
          <el-button 
            type="text" 
            class="forgot-password"
            @click="handleForgotPassword"
          >
            忘记密码？
          </el-button>
        </div>

        <!-- 登录按钮 -->
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loginLoading"
            class="login-button"
            @click="handleLogin"
          >
            {{ loginLoading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>

        <!-- 分割线 -->
        <div class="divider">
          <span class="divider-text">或者</span>
        </div>

        <!-- 注册链接 -->
        <div class="register-link">
          还没有账号？
          <el-button 
            type="text" 
            class="register-button"
            @click="handleRegister"
          >
            立即注册
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, FormInstance, FormRules } from 'element-plus'
import { User, Lock, Loading, CircleCheck, CircleClose } from '@element-plus/icons-vue'
import { authService } from '@/services/auth'

// 用户名或邮箱验证函数
function validateUsernameOrEmail(value: string): boolean {
  if (!value) {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

  if (emailRegex.test(value)) {
    if (value.length > 100) {
      return false;
    }
    return true;
  } else if (usernameRegex.test(value)) {
    return true;
  } else {
    return false;
  }
}

// 路由
const router = useRouter()

// 响应式引用
const loginFormRef = ref<FormInstance>()
const loginLoading = ref(false)

// 登录表单数据
const loginForm = reactive({
  username: '',
  password: '',
  remember: false,
  error: null as string | null
})

// 验证状态
const usernameValidation = reactive({
  status: 'idle', // idle, valid, invalid, loading
  message: '',
  loading: false
})

const passwordValidation = reactive({
  status: 'idle', // idle, valid, weak, invalid, loading
  score: 0,
  message: '',
  loading: false
})

// 用户名输入处理
const handleUsernameInput = () => {
  if (usernameValidation.status !== 'idle') {
    usernameValidation.status = 'idle'
    usernameValidation.message = ''
  }
}

// 密码输入处理
const handlePasswordInput = () => {
  if (passwordValidation.status !== 'idle') {
    passwordValidation.status = 'idle'
    passwordValidation.message = ''
    passwordValidation.score = 0
  }
}

// 用户名验证
const validateUsername = () => {
  const value = loginForm.username.trim()
  if (!value) {
    usernameValidation.status = 'invalid'
    usernameValidation.message = '请输入用户名或邮箱'
    return
  }

  // 基本格式检查
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/

  if (emailRegex.test(value)) {
    // 邮箱格式检查
    if (value.length > 100) {
      usernameValidation.status = 'invalid'
      usernameValidation.message = '邮箱长度不能超过100个字符'
      return
    }
    
    usernameValidation.status = 'valid'
    usernameValidation.message = '邮箱格式正确'
  } else if (usernameRegex.test(value)) {
    // 用户名格式检查
    usernameValidation.status = 'valid'
    usernameValidation.message = '用户名格式正确'
  } else {
    usernameValidation.status = 'invalid'
    usernameValidation.message = '请输入有效的用户名（3-20个字符，只能包含字母、数字和下划线）或邮箱地址'
  }
}




// 密码验证
const validatePassword = () => {
  const value = loginForm.password
  if (!value) {
    passwordValidation.status = 'invalid'
    passwordValidation.message = '请输入密码'
    return
  }

  // 基本密码验证
  if (value.length < 6) {
    passwordValidation.status = 'invalid'
    passwordValidation.message = '密码长度至少为6位'
    passwordValidation.score = 1
    return
  }

  // 密码强度检查
  let score = 0
  const hasLower = /[a-z]/.test(value)
  const hasUpper = /[A-Z]/.test(value)
  const hasNumber = /\d/.test(value)
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)

  if (hasLower) score++
  if (hasUpper) score++
  if (hasNumber) score++
  if (hasSpecial) score++

  if (value.length >= 8) score++

  // 验证结果
  if (score < 2) {
    passwordValidation.status = 'weak'
    passwordValidation.message = '密码强度太弱'
    passwordValidation.score = 1
  } else if (score < 4) {
    passwordValidation.status = 'valid'
    passwordValidation.message = '密码强度良好'
    passwordValidation.score = 2
  } else {
    passwordValidation.status = 'valid'
    passwordValidation.message = '密码强度很强'
    passwordValidation.score = 4
  }
}

// 表单验证规则
const loginRules: FormRules = {
  username: [
    { 
      required: true, 
      message: '请输入用户名或邮箱', 
      trigger: 'blur' 
    },
    { 
      validator: (rule: any, value: string, callback: (error?: string | Error) => void) => {
        if (!value) {
          callback(new Error('请输入用户名或邮箱'))
          return
        }

        const trimmedValue = value.trim()
        
        // 邮箱格式检查
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/

        if (emailRegex.test(trimmedValue)) {
          if (trimmedValue.length > 100) {
            callback(new Error('邮箱长度不能超过100个字符'))
            return
          }
          callback()
        } else if (usernameRegex.test(trimmedValue)) {
          callback()
        } else {
          callback(new Error('请输入有效的用户名（3-20个字符，只能包含字母、数字和下划线）或邮箱地址'))
        }
      }, 
      trigger: 'blur' 
    }
  ],
  password: [
    { 
      required: true, 
      message: '请输入密码', 
      trigger: 'blur' 
    },
    { 
      min: 6, 
      message: '密码长度至少为6位', 
      trigger: 'blur' 
    }
  ]
}

// 登录处理
const handleLogin = async () => {
  if (!loginFormRef.value) return

  try {
    // 手动验证表单
    await loginFormRef.value.validate()
    
    loginLoading.value = true
    loginForm.error = null

    // 调用认证服务登录
    const user = await authService.login(
      loginForm.username,
      loginForm.password,
      loginForm.remember
    )
    
    console.log('登录成功:', {
      username: user.username,
      role: user.role,
      permissions: user.permissions?.length || 0
    })
    
    // 等待认证状态更新完成
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 获取保存的重定向路径，或使用默认的Dashboard路径
    const redirectPath = sessionStorage.getItem('redirectPath') || '/dashboard'
    
    // 清理保存的重定向路径
    sessionStorage.removeItem('redirectPath')
    
    console.log('准备跳转到:', redirectPath)
    
    // 使用router.push进行编程式导航
    await router.push(redirectPath)
    
    // 显示成功提示
    ElMessage.success(`欢迎回来，${user.username}!`)

  } catch (error: any) {
    console.error('登录失败:', error)
    
    // 设置错误信息
    loginForm.error = error.message || '登录失败，请检查用户名和密码'
    
    // 显示错误消息
    ElMessage.error(loginForm.error)
  } finally {
    loginLoading.value = false
  }
}

// 注册处理
const handleRegister = () => {
  router.push('/register')
}

// 忘记密码处理
const handleForgotPassword = () => {
  router.push('/forgot-password')
}

// 组件挂载时清理状态
onMounted(() => {
  usernameValidation.status = 'idle'
  usernameValidation.message = ''
  usernameValidation.loading = false
  
  passwordValidation.status = 'idle'
  passwordValidation.message = ''
  passwordValidation.score = 0
  passwordValidation.loading = false
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
  backdrop-filter: blur(10px);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 8px 0;
}

.login-subtitle {
  color: #718096;
  font-size: 14px;
  margin: 0;
}

.login-form {
  width: 100%;
}

.form-item {
  margin-bottom: 24px;
}

.input-container {
  position: relative;
  width: 100%;
}

.validation-loading {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
}

.validation-success,
.validation-error {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
}

.validation-message {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.4;
}

.validation-message.valid {
  color: #67C23A;
}

.validation-message.invalid {
  color: #F56C6C;
}

.validation-message.weak {
  color: #E6A23C;
}

.password-strength {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
}

.strength-bars {
  display: flex;
  gap: 2px;
}

.strength-bar {
  width: 3px;
  height: 16px;
  background-color: #e4e7ed;
  border-radius: 1px;
  transition: background-color 0.3s ease;
}

.strength-bar.active {
  background-color: #67C23A;
}

.strength-bar:nth-child(3).active,
.strength-bar:nth-child(4).active {
  background-color: #67C23A;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.forgot-password {
  color: #667eea;
  font-size: 14px;
  padding: 0;
}

.login-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.login-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.divider {
  position: relative;
  text-align: center;
  margin: 24px 0;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(to right, transparent, #e4e7ed, transparent);
}

.divider-text {
  background: white;
  color: #a0aec0;
  padding: 0 16px;
  font-size: 12px;
  position: relative;
}

.register-link {
  text-align: center;
  color: #718096;
  font-size: 14px;
}

.register-button {
  color: #667eea;
  font-weight: 500;
  padding: 0;
}


</style>