import { greet } from './greet.ts'

document.querySelector('#app')!.textContent = greet('world')
