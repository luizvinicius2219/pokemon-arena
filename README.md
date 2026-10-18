# Monster Arena — protótipo Pokémon 0.5

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
- **Q** — Brasas: projétil de fogo com formato de chama e rastros, **0,45s** de recarga.
- **W** — Lança-Chamas: sopro contínuo com nove línguas de fogo escalonadas, **2,3s**.
- **E** — Explosão de Fogo: chama giratória com explosão em camadas, **3,8s**.
- **R** — Rajada de Fogo: disparo especial, fragmentos laterais e explosão com câmera, **7,6s**.
- **Espaço** — esquiva em direção ao cursor, **1,9s**.
- **Enter** — reiniciar após o fim do combate.

Há um indicador individual de cooldown no painel inferior. O botão **Controles** permite remapear teclas, impede conflitos e salva as preferências no `localStorage`.

## Pikachu (IA)

Pikachu utiliza **Choque do Trovão** (0,85s), **Onda de Choque** (3,4s), **Raio** (4,5s) e **Trovão** (9s). Os últimos dois são sinalizados no chão antes de atingir, permitindo desviar.

## Estrutura

- `src/main.ts`: layout e controles configuráveis
- `src/arena.ts`: lógica da arena, colisões, inteligência artificial, ataques e efeitos
- `src/abilities.ts`: nomes, danos e recargas das habilidades
- `src/combatFx.ts`: efeitos procedurais de fogo e eletricidade, rastros, partículas, raios e impactos (sem arquivos visuais adicionais)
- `src/gifAnimation.ts`: decodificação dos GIFs em quadros do Phaser
- `src/controls.ts`: persistência e validação do remapeamento

Os sprites de Pokémon são carregados remotamente do repositório de sprites da PokéAPI e continuam sujeitos a direitos autorais dos respectivos titulares. O projeto é um protótipo experimental, sem multiplayer ou distribuição de arquivos de sprites junto ao código.

## Novidades da versão 0.5

- Chamas desenhadas em formas angulares e raios com traçado irregular; as colisões usam hitboxes invisíveis.
- Pequena preparação (*wind-up*) antes de soltar cada habilidade, seguida de animação corporal de disparo e recuperação.
- Efeitos de partículas limitados para proteger a taxa de quadros em batalhas longas.
- Impactos com ondas expansivas, fragmentos, indicação de dano, breve hit-stop e vibração de câmera.
- O Lança-Chamas passa a ser uma sequência escalonada de chamas, não cinco bolas simultâneas.
- Habilidades e cooldowns configurados anteriormente permanecem iguais.

Os sprites animados do Pokémon continuam vindo da PokéAPI. Não foram incorporadas poses de ataque adicionais de fãs nesta versão, pois é necessário conferir qualidade e permissão de redistribuição antes de incluí-las.
