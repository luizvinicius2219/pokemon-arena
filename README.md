# Monster Arena — protótipo Pokémon 1.2

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

## Novidades da versão 0.9 — feixe de fogo e esquiva real

- **W (Lança-Chamas)** agora é um feixe de fogo contínuo de até aproximadamente 385 pixels de alcance, com camadas de calor, corpo laranja, núcleo amarelo/branco e extremidade incandescente.
- O feixe acompanha a mira de forma gradual; seu dano é aplicado em intervalos durante o contato, usando a mesma geometria de alcance exibida na tela. Não existem mais as nove pequenas bolas desse golpe.
- **Esquiva (espaço / dash mobile)** desloca o personagem progressivamente ao longo de 230ms, com aceleração/desaceleração suaves, fantasmas de movimento e partículas de poeira azul.
- Durante a esquiva, Charizard utiliza a folha de animação **Hop** do PMD Sprite Repository, incluindo quadros reais de salto/esquiva. Os primeiros 70% do dash concedem um breve período de invulnerabilidade.
- No desktop, a esquiva mantém a direção do cursor; no celular, segue o joystick ou, quando parado, a direção do inimigo.
- Ataques não interrompem a animação de esquiva. O joystick e os botões universais 1–4 permanecem iguais.
- O lançamento do Lança-Chamas continua sincronizado ao quadro de disparo do sprite; a animação de Shoot se prolonga durante o jato.

### Observações

A versão 0.9 mantém o dano total do jato em uma faixa próxima à versão anterior; tempo, posição, alcance e esquiva passam a ser determinantes para acertá-lo. O jogo permanece inteiramente 2D e utiliza sprites carregados remotamente do acervo PMD, com atribuições documentadas em [CREDITS.md](CREDITS.md).

## Versão 1.0 — impacto e combate com movimentação mais viva

- **Reação real a golpes:** Charizard e Pikachu executam a animação `Hurt` com brilho e deformação sutil, acompanhada de recuo progressivo de 140–195 ms (conforme força do ataque). O recuo também move a hitbox, sem teletransporte.
- **VFX de impacto:** marcas direcionais, ondas no chão e partículas combinadas com o elemento de fogo ou eletricidade. Golpes pesados têm números de dano maiores.
- **Barras de vida flutuantes:** cada Pokémon tem HP perto do corpo, com faixa residual que acompanha a perda de vida gradualmente, além do HUD original.
- **Pikachu mais dinâmico:** alterna perseguição, afastamento e movimentação lateral ao redor do Charizard em vez de parar completamente à distância ideal.
- **Combate com peso:** movimento reduzido levemente durante a canalização de Lança-Chamas e breve interrupção de deslocamento após receber dano. Joystick, dash animado, mira e cooldowns seguem funcionando.
- **Proteção contra eventos simultâneos:** um mesmo Pokémon não recebe múltiplos registros de impacto dentro de uma janela de 75 ms; ataques canalizados continuam causando dano em intervalos.

A atualização continua usando as folhas PMD de animação `Hurt` e mantém as atribuições em [CREDITS.md](CREDITS.md).

## Versão 1.1 — apresentação cinematográfica dos especiais

- Nova camada `src/cinematicFx.ts` com efeitos de carga e liberação sincronizados ao combate. Usa um único `Graphics` para desenhar visualizações animadas em tempo real, evitando centenas de novos objetos por quadro.
- **Charizard E — Explosão de Fogo:** círculo de carregamento próximo ao corpo, partículas convergentes, liberação brilhante e explosão com anéis em múltiplas camadas. Após a carga, assume os quadros `Shoot`.
- **Charizard R — Rajada de Fogo:** carregamento rotativo mais visível, anúncio do especial, onda de liberação e explosão final ampliada, com breve flash suave de cor.
- **Pikachu E/R — Raio/Trovão:** partículas elétricas em volta do Pokémon durante a carga e explosões elétricas ramificadas nas áreas atingidas. O Trovão exibe um anúncio na preparação.
- **Pikachu W — Onda de Choque:** reforço de saída do golpe com onda visual.
- Os efeitos acompanham a posição dos Pokémon enquanto se movem e são limitados para não sobrecarregar celulares.
- Para usuários com `prefers-reduced-motion: reduce`, flashes de tela adicionais são desativados.
- Controle universal de habilidades, joystick, cooldowns, dash animado e balanceamento de danos anteriores preservados.

Estas melhorias são visuais; a mecânica das habilidades e a estrutura de controles não foram substituídas.

## Versão 1.2 — combos e resultados de batalha

- **Contador de combos:** acertos consecutivos em Pikachu acumulam combos por 3,3 segundos. O contador e a barra de expiração aparecem dentro da arena a partir do segundo golpe. Sofrer dano interrompe o combo.
- **Feedback de esquiva:** quando um golpe efetivamente seria recebido durante os quadros invulneráveis do dash, surge **ESQUIVA!** e o evento é registrado no resumo, sem alterar a invulnerabilidade anterior.
- **Resumo de partida:** painel com vitória/derrota, tempo, classificação, dano causado/recebido, acertos, maior combo, esquivas realizadas e ataques evitados. Serve tanto no PC quanto no celular.
- **Recordes locais opcionais:** maior combo e melhor tempo de vitória ficam salvos somente em `localStorage` no navegador. O jogo funciona normalmente se o navegador bloquear armazenamento.
- A implementação isolada em `src/battleStats.ts` não altera os valores de dano, o comportamento da IA, cooldowns ou o joystick.
- Botão de reinício por toque e Enter seguem disponíveis.

*Classificação S/A/B/C é uma métrica ilustrativa de desempenho baseada em vida restante, combos, esquivas efetivas e tempo. Não altera recompensas nem progressão de personagens.*

### Resumo no celular

Ao terminar a luta no celular, o painel de resultados aparece em uma janela responsiva com texto legível e botão **Jogar novamente**, sem exigir teclado ou ampliação do canvas. No computador, o resumo continua dentro da arena.

## Versão 1.3 — Kanto: prévia do Ginásio de Pewter (Brock)

A primeira base técnica do modo história já está no jogo. No cabeçalho, escolha **História: Pewter** para entrar no ginásio; **Arena Livre** retorna ao campo de treino.

- **Design:** piso em ladrilhos de pedra, zona central de combate, pódio do líder e marcações rochosas. Brock e quatro treinadores/espectadores aparecem nos cantos e ao fundo como **NPCs provisórios, desenhados proceduralmente**.
- **Cenário interativo:** quatro rochas (42 HP) e dois pilares (64 HP), com estados **inteiro / rachado / destruído**. Ataques convencionais destroem obstáculos e abrem rotas; projéteis colidem nas pedras. O Lança-Chamas é visualmente interrompido pela cobertura e causa dano nas rochas ao longo do contato.
- **Movimentação:** Charizard, Pikachu e a esquiva usam resolução de colisão contra os obstáculos intactos.
- **Estrutura técnica:** `src/story.ts` contém `StoryStage`, `StageNpc`, `BreakableObstacle`, `StoryEnvironment`, `kantoGymOrder`, desenho de cenário, interceptação, colisão e destruição. A cena principal alterna a arena por `GameMode`; os controles mobile e PC continuam compartilhados.
- **Limitação intencional:** a luta permanece **Charizard vs. Pikachu como adversário provisório**. O Brock é um NPC visual do ginásio, **não é ainda um treinador com seu time**, e vencer a prévia não concede insígnia nem desbloqueia ginásios.

### Próximas etapas do modo história
1. Adicionar Geodude e Onix com animações e conjuntos próprios de quatro habilidades.
2. Criar `TrainerEncounter` e sequência de desafios dos treinadores auxiliares até o Brock.
3. Conceder a Insígnia de Pedra e salvar o progresso somente após a verdadeira batalha de Brock.
4. Implementar o sistema `PokemonRoster` com captura, experiência e evolução, preservando os controles universais.
5. Reaproveitar o registro `kantoGymOrder` para Misty, Lt. Surge, Erika, Koga, Sabrina, Blaine e Giovanni.

As representações temporárias dos treinadores são figuras geométricas originais; nenhum sprite externo de Brock foi incorporado nesta etapa.

## Atualização Pewter Lite — pixel art estática

O Ginásio de Pewter usa fundo estático desenhado em pixel art, cinco treinadores em sprites pixelizados originais e seis rochas/pilares com duas texturas de dano e remoção na destruição. A antiga renderização procedural de ladrilhos, os NPCs com tweens infinitos e os efeitos de fragmentação foram retirados para reduzir carga no celular. A Arena Livre e o combate permanecem iguais. Os assets originais (SVG com formas em grade, rasterizados uma única vez pelo Phaser) ficam em `public/assets/story/pewter`. Brock ainda é um NPC visual, e Pikachu permanece como adversário de teste.
