# Vivapark Porto Belo

Landing page institucional do Vivapark, em Porto Belo, Santa Catarina.

Site estático: HTML, CSS e JavaScript sem dependências, sem build e sem
framework. `index.html` está na raiz, então a Vercel publica direto, sem
configuração nenhuma.

## Estrutura

```
index.html        a página inteira
css/style.css     todo o estilo
js/script.js      a sequência de abertura e as entradas por rolagem
images/           fotos e perspectivas (WebP, em três larguras)
fonts/            Livvic e Michroma, hospedadas localmente
```

## Como rodar

Não precisa de servidor para ler o código, mas a abertura depende de rolagem
real — vale servir a pasta:

```
python -m http.server 8080
```

E abrir `http://localhost:8080`.

## A abertura

No desktop, o topo é uma sequência dirigida pela rolagem: a tela de
carregamento sobe, o título se escreve, a câmera voa até a janela da torre e
um estouro branco corta para a dobra seguinte. Tudo isso vive em
`js/script.js` e nas regras sob `@media (min-width: 981px)` do CSS.

No celular a sequência não existe — só a tela de carregamento. É proposital:
o voo depende de uma tela larga para fazer sentido.

A página respeita `prefers-reduced-motion`: com a preferência ligada, nada
disso roda.

## Imagens

As perspectivas são ilustrativas e estão marcadas como tal na página.
