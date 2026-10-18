# Monster Arena — protótipo Pokémon 0.4

Arena 2D de combate em tempo real desenvolvida com **Phaser 3 + TypeScript + Vite**, com Charizard controlado pelo jogador e Pikachu controlado pelo computador.

## Executar

```bash
npm install
npm run dev
```

Versão de produção: `npm run build`. O GitHub Actions verifica a compilação a cada push na branch `main`.

## Controles

- **Clique direito**: movimentar até o ponto clicado (também permite arrastar com o botão pressionado).
- **Cursor**: mirar as habilidades.
- **Q** — Brasas: projétil rápido, **0,45s** de recarga.
- **W** — Lança-Chamas: leque de cinco chamas, **2,3s**.
- **E** — Explosão de Fogo: projétil com explosão em área, **3,8s**.
- **R** — Rajada de Fogo: grande explosão com dois fragmentos laterais, **7,6s**.
- **Espaço** — esquiva em direção ao cursor, **1,9s**.
- **Enter** — reiniciar após o fim do combate.

Há um indicador individual de cooldown no painel inferior. O botão **Controles** permite remapear teclas, impede conflitos e salva as preferências no `localStorage`.

## Pikachu (IA)

Pikachu utiliza **Choque do Trovão** (0,85s), **Onda de Choque** (3,4s), **Raio** (4,5s) e **Trovão** (9s). Os últimos dois são sinalizados no chão antes de atingir, permitindo desviar.

## Estrutura

- `src/main.ts`: layout e controles configuráveis
- `src/arena.ts`: lógica da arena, colisões, inteligência artificial, ataques e efeitos
- `src/abilities.ts`: nomes, danos e recargas das habilidades
- `src/gifAnimation.ts`: decodificação dos GIFs em quadros do Phaser
- `src/controls.ts`: persistência e validação do remapeamento

Os sprites de Pokémon são carregados remotamente do repositório de sprites da PokéAPI e continuam sujeitos a direitos autorais dos respectivos titulares. O projeto é um protótipo experimental, sem multiplayer ou distribuição de arquivos de sprites junto ao código.
