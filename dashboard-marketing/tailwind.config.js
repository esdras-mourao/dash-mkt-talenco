export default {
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        talenco: {
          yellow:    '#F2B82A',
          dark:      '#454545',
          terracota: '#C6552A',
          ocean:     '#1A4060',
          sand:      '#F7F3EE',
          night:     '#1C1410',
        }
      },
      fontFamily: {
        sans:    ['Montserrat','sans-serif'],
        display: ['Montserrat','sans-serif'],
        body:    ['Montserrat','sans-serif'],
      }
    }
  },
  plugins: []
}
