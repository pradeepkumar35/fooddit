import { client } from './client'

export const signup = (data) => client.post('/auth/signup', data).then((res) => res.data)
export const login = (data) => client.post('/auth/login', data).then((res) => res.data)
export const forgotPassword = (email) => client.post('/auth/forgot-password', { email }).then((res) => res.data)
export const resetPassword = (data) => client.post('/auth/reset-password', data).then((res) => res.data)
