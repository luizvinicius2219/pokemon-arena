# Monster Arena — protótipo

Arena 2D experimental de combate em tempo real construída com **Phaser 3 + TypeScript + Vite**.

## Executar

```bash
npm install
npm run dev
```

Abra a URL indicada pelo Vite. Para gerar a versão de produção: `npm run build`.

## Controles

- Clique direito na arena: andar até o ponto selecionado.
- Q/W/E: projéteis com velocidades e danos diferentes.
- R: ataque especial de alto dano.
- Espaço: esquiva na direção do cursor.
- Enter: reiniciar após a batalha.
- Botão **Controles**: remapear teclas, bloquear duplicidades e restaurar padrão. Configurações persistem no localStorage.

## Escopo

O adversário é controlado por IA local simples. Os combatentes são representações geométricas originais, sem assets de Pokémon. O jogo é apenas um protótipo e ainda não possui multiplayer nem sprites animados.
