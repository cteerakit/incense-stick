import { registerSW } from 'virtual:pwa-register'
import './style.css'
import { mount } from './ui'

registerSW({ immediate: true })

mount(document.querySelector('#app')!)
