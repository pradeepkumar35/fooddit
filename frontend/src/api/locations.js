import { client } from './client'

export const listCities = () => client.get('/cities').then((res) => res.data)
export const listLocalities = (citySlug) => client.get(`/cities/${citySlug}/localities`).then((res) => res.data)
