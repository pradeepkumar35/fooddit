import { client } from './client'

export const listAddresses = () => client.get('/me/addresses').then((res) => res.data)
export const createAddress = (data) => client.post('/me/addresses', data).then((res) => res.data)
export const updateAddress = (id, data) => client.patch(`/me/addresses/${id}`, data).then((res) => res.data)
export const deleteAddress = (id) => client.delete(`/me/addresses/${id}`).then((res) => res.data)
export const setDefaultAddress = (id) => client.post(`/me/addresses/${id}/default`).then((res) => res.data)