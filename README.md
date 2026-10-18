# Monster Arena — protótipo Pokémon 0.8

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

## Novidades da versão 0.6 — personagens que realmente caminham

O jogo agora carrega folhas de animação de exploração do **PMD Sprite Repository**, com **8 direções**, em vez de usar apenas o GIF animado de batalha para simular caminhada.

- **Walk:** caminhada de 4 quadros por direção, com ritmo definido pelo `AnimData.xml` original.
- **Idle:** animação de repouso real, diferente do ciclo de caminhada.
- **Shoot / Attack / Charge:** animações próprias para as habilidades; o personagem deixa de disparar com o corpo imóvel.
- **Hurt:** animação real ao receber dano.
- **Oito direções:** cima, baixo, esquerda, direita e diagonais, sem espelhar uma única imagem.
- O Charizard e o Pikachu mantêm escalas diferentes para preservar a proporção.
- As sequências antigas da PokéAPI continuam como **fallback** se os arquivos de exploração não carregarem.
- O Lança-Chamas do Charizard agora alcança mais longe, com a mesma recarga.

As informações de tamanho de cada quadro e sua duração vieram do `AnimData.xml` de cada Pokémon. O projeto **não utiliza modelos 3D**, para preservar desempenho e o visual pixel art.

**Créditos e direitos:** consulte [CREDITS.md](./CREDITS.md). Os assets do repositório incluem sprites originais de jogos Pokémon e contribuições de fãs. A licença CC BY-NC 4.0 dos colaboradores não substitui os direitos da Nintendo/The Pokémon Company e detentores originais. Uso restrito ao protótipo não comercial.

## Novidades da versão 0.7 — controles de celular

- Joystick virtual analógico no lado esquerdo: mova o dedo em qualquer direção para caminhar, solte para parar.
- Cinco botões de habilidades no lado direito: **Q / W / E / R / esquiva**. É possível mover e atacar simultaneamente usando dois dedos.
- **Mira automática** no Pikachu para habilidades no celular. A esquiva usa a direção do joystick; caso esteja parado, usa a direção do inimigo.
- Cooldowns individuais nos botões de toque, atualizados durante a partida.
- Botão **Jogar novamente** ao finalizar a partida; o celular não precisa de teclado.
- Layout responsivo: controles abaixo da arena no modo retrato e sobrepostos nas bordas no modo paisagem.
- Prevenção de scroll e zoom acidental durante o uso do joystick; reconhecimento de toques rápidos mesmo entre quadros.
- Controles do mouse/teclado no computador permanecem inalterados; o jogo não exige aplicativo ou instalação.

**Arquivos:** `src/mobileControls.ts` implementa o gamepad multitouch; `src/main.ts` oferece a interface; `src/arena.ts` integra movimento analógico, mira e recarga.

## Novidades da versão 0.8 — habilidades com identidade e controle universal

- Os botões móveis agora são **1, 2, 3, 4 e esquiva**, sem ícones associados a um Pokémon específico.
- A função `MobileControls.setAbilityNames(pokemon)` atualiza os nomes acessíveis para outros Pokémon sem trocar o layout do controle.
- A saída dos ataques usa a marcação `HitFrame` das animações PMD para sincronizar corpo e magia.
- Os projéteis de fogo foram redesenhados com chamas onduladas em camadas, no lugar das formas triangulares.
- **Lança-Chamas** tem um jato visual contínuo, com alcance maior e núcleo luminoso, além de seus hitboxes já existentes.
- Movimentação, mira automática, multitouch e cooldowns no mobile foram preservados.

O novo fluxo deixa o controle pronto para futura seleção de Pokémon sem antecipar a implementação dessa tela.
