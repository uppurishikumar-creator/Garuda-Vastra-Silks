# Rebuilds ../index.html from style.css + body.html + app.js  (run: cd src && python build.py)
import base64, re
c1="https://horizons-cdn.hostinger.com/f56b7f19-8513-495b-ae14-ca206c95afd1/"
c2="https://images.hostinger.com/"
store="data:image/jpeg;base64,"+base64.b64encode(open('store.jpg','rb').read()).decode()
css=open('style.css',encoding='utf-8').read(); body=open('body.html',encoding='utf-8').read(); js=open('app.js',encoding='utf-8').read()
js=js.replace('window.fb = fb;','window.fb = fb;\n(window._fbq||[]).forEach(([im,i])=>fb(im,i));')
head=open('../index.html',encoding='utf-8').read().split('<style>')[0]
html=head+'<style>'+css+'</style>\n</head>\n<body>\n'+body+'<script>'+js+'</script>\n</body>\n</html>\n'
html=html.replace('__C1__',c1).replace('__C2__',c2).replace('__STORE__',store)
open('../index.html','w',encoding='utf-8').write(html); print('index.html rebuilt')
