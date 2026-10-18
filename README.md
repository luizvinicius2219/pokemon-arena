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


## Pewter Arena — visual retrabalhado (inspirado nas arenas top-down de batalha)

- Novo piso estático em pixel art fria: mosaico de pedras azul-acinzentadas, arena circular com frisos dourados, medalhão rochoso central, escadaria de acesso, arquibancadas e pilares decorativos na estrutura.
- Identidade de ginásio reforçada com **Brock no topo, treinadores nas quatro laterais e adversários alinhados verticalmente**, como nas referências de arenas de batalha fornecidas.
- Quatro rochas destrutíveis reposicionadas nas bordas do círculo: texturas em dois estados (intacta/rachada), desaparecimento ao quebrar, colisão e bloqueio de ataques preservados. Os dois pilares colidíveis do centro foram retirados para deixar a luta aberta; pilares arquitetônicos permanecem como decoração estática.
- Sprites de Brock, treinadores e rochas redesenhados com pixels definidos, iluminação em camadas e contorno escuro, sem animação contínua; assets originais construídos para este protótipo.
- A Arena Livre, os controles e o combate da versão anterior foram preservados. Não há efeitos de cenário rodando a cada quadro. O Brock ainda é visual; o oponente continua sendo Pikachu na prévia.


## Pewter — identificação dos treinadores e introdução

O Ginásio de Pewter agora exibe o líder Brock com sprite clássico mais fiel à franquia e o jogador representado por Red no limite inferior da arena. São personagens estáticos de ambientação, distintos dos Pokémon combatentes e sem IA própria. Sprites originais locais mantêm o visual íntegro quando o repositório de retratos externos não está disponível. A entrada do ginásio apresenta por poucos segundos uma fala de Brock e o aviso de que Pikachu ainda é adversário de teste, sem pausar a jogabilidade. A Arena Livre permanece inalterada. Veja atribuições em `CREDITS.md`.


## Ginásio de Pewter: Geodude e Onix (combate em duas etapas)

- O ginásio usa o time inicial do Brock: **Geodude** seguido de **Onix**, ambos com as animações em oito direções do PMD Sprite Repository.
- Geodude: Pedrada, Soco de Pedra, Desabamento e Terremoto.
- Onix: Rocha Afiada, Cauda de Ferro, Pedra Tombante e Fissura.
- A luta passa automaticamente de Geodude para Onix sem recarregar o mapa nem restaurar o HP do jogador. Há pausa breve de convocação, identificação de espécie e barra de vida específica.
- As quatro habilidades de cada criatura possuem cooldown e dano próprios. O visual de rocha inclui projéteis facetados, sombras de queda, alertas de área, impacto de pedras, rachaduras e ondas de choque, em um único Graphics leve para mobile.
- O arquivo `src/pokemonCatalog.ts` registra todas as espécies, HP, raio de colisão, velocidade, tipos, habilidade, sprite e status de utilização futura. `src/rockMoves.ts` expõe as habilidades de rocha com parâmetro `side` (jogador ou inimigo), preparado para a futura tela de seleção e controle de criaturas diferentes.
- Por ora Charizard continua como Pokémon jogável e a luta continua sendo prévia: **a insígnia de Pedra ainda não é concedida**. Multiplicadores por fraqueza/resistência e evolução vêm depois.
- Arena Livre/Pikachu mantém a mecânica e os controles anteriores.


### Refinamento dos treinadores e do mobile

Os sprites clássicos originais de Brock e Red agora recebem espaço visual maior, com posicionamento mais fiel a um palco de ginásio. Os SVGs locais de reserva foram ajustados em cores e figurino. O cabeçalho da sequência de combate foi deslocado para não cobrir o rosto do Brock. O carregamento das animações de Geodude e Onix evita o sprite de esquiva que não é utilizado por esses adversários, economizando rede e memória durante o modo história.


### Sprites reais de treinadores — locais

O cenário Pewter carrega os sprites pixelados clássicos diretamente de PNGs locais: Brock (Black 2/White 2), Red (FireRed/LeafGreen), Montanhista e Campista (Gen III). Foram retiradas as dependências em portraits externos e os desenhos improvisados dos treinadores do palco. O fundo, as pedras quebráveis e o combate seguem intactos. Licenciamento documentado em `CREDITS.md`.


### Movimentos canônicos de Geodude e Onix

Os nomes inventados da primeira prévia foram substituídos por golpes que existem nos jogos (representados com física de combate em tempo real): **Geodude — Pedrada (Rock Throw), Rolagem (Rollout), Tumba de Rochas (Rock Tomb), Magnitude**; **Onix — Deslizamento de Rochas (Rock Slide), Constrição (Bind), Tumba de Rochas (Rock Tomb), Terremoto (Earthquake)**.

Rolagem executa 3 investidas crescentes; Rock Slide lança 3 fragmentos em leque; Constrição aplica lentidão com três pulsos de dano após conectar; Tumba de Rochas aplica lentidão temporária se acertar; Magnitude varia a intensidade; Terremoto expande em 2 ondas. Todas as áreas avisam no chão antes de atingir, respeitam esquiva e são renderizadas num único `Graphics` com orçamento limitado. O motor `RockMoves` permanece independente do lado de batalha e pronto para a futura seleção de Pokémon.


### Pewter: sprites de exploração de verdade e apresentação VS

Sprites grandes de treinador deixaram de ocupar o piso: Brock, Red, montanhistas e campistas são renderizados com **spritesheet de exploração de FireRed/LeafGreen**, em perspectiva top-down, com arte GBA e interpolação pixelada, sem novos desenhos vetoriais. O Red aparece de costas na plataforma sul. Os retratos maiores (Black 2/White 2 e FireRed/LeafGreen) agora aparecem apenas na introdução **VS Red x Brock**, com início de combate após a apresentação, não durante.


### Terremoto e Magnitude com rachaduras reais no piso

Cada impacto sísmico faz surgir uma malha ramificada de rachaduras escuras com bordas de pedra exposta e cascalho. O decalque é rasterizado **uma única vez** em uma CanvasTexture pequena, exibido como um sprite e se desfaz após alguns segundos; o fundo do ginásio permanece um único bitmap estático. A queda de pedras tem volume facetado, iluminação e sombra de aproximação. Fendas, placas de terreno projetadas e tremor de câmera são usados nos golpes sísmicos, preservando a prioridade de desempenho no celular.


### Troca de Pokémon com Pokébola — ritmo de batalha

Geodude agora é recolhido com feixe vermelho, brilho de captura e movimento da Pokébola até Brock. O líder anuncia Onix, lança a nova Pokébola e o Pokémon surge numa segunda luz vermelha com abertura mais lenta. Durante a troca, o combate é temporariamente pausado (sem teleporte instantâneo, sem dano acidental no Pokémon que entra). O efeito está encapsulado em `src/pokemonSwitchFx.ts`, independente da espécie, pronto para futuras equipes e modo seleção. A introdução VS também pausa os comandos até o início real da luta.


### Cadência de batalha e correções de animação

O tempo do ranking agora desconta os segundos em que o jogo bloqueia combate para mostrar a introdução VS ou trocar Pokémon. A primeira imagem da animação PMD é selecionada explicitamente, evitando mostrar a spritesheet inteira durante a luz vermelha de saída da Pokébola. Magnitude pode atingir nível 10; a segunda onda do Terremoto de Onix alcança uma área maior, permitindo desviar pelo dash cronometrado. Nenhum dano ocorre enquanto a troca ou a abertura estão em andamento.


### Onix gigante, Dig e batalha apresentada com a equipe real

Onix foi ampliado para uma escala de chefe e entra mais ao centro do ginásio, mantendo Brock visível no palco. Seu segundo golpe agora é **Escavar (Dig)**: desaparece sob o piso, fica temporariamente inalvejável, assinala a zona de reaparição e emerge com impacto. Os danos de Terremoto e Magnitude permanecem definidos por alcance, mas o desenho das rachaduras agora usa linhas finas e área contida; projéteis de rocha ganharam tons claros de arenito. A introdução VS usa os nomes e as imagens das espécies do mesmo catálogo/roster consumido pela batalha; na futura seleção de Pokémon não será necessário desenhar outra apresentação.


## Próxima fase — equipe, captura e progressão próprias

A base de dados agora comporta Pokémon individuais do jogador (não apenas espécies), com **equipe de até três, reserva, Pokémon ativo, níveis, experiência e insígnias**. `src/playerCollection.ts` implementa a persistência local de forma independente da batalha. `src/captureSystem.ts` fornece chances de captura em encontros **selvagens**, com bônus por timing/atordoamento, enfraquecimento e equipamento; proíbe capturar Pokémon de treinador e chefes. São **módulos preparatórios**: ainda não existe botão de captura, tela de coleção nem encontro selvagem jogável.

Direção: um **jogo de ação e exploração com batalhas em tempo real**, captura sob pressão, formação de equipes e chefes com padrões próprios, mantendo um ritmo diferente da fórmula tradicional de turnos. Próxima implementação: primeiro encontro selvagem controlado, minijogo de captura e tela de equipe conectados a esses dois módulos.


## Roteiro do jogo / primeiro capítulo

Veja [GAME_ROADMAP.md](GAME_ROADMAP.md). A arena de Pewter é um **protótipo do chefe** e continuará acessível como atalho de teste enquanto construímos a vila, a rota de encontros e a área de treinamento. O objetivo é enfrentar Brock com o inicial obtido na história, e não começar com Charizard. A Arena Livre mantém os personagens avançados para testes de combate.


## Charmander: golpes oficiais e direção visual

A versão de testes de Charmander agora usa **Arranhão, Rosnar, Brasas e Cortina de Fumaça**, aprendidos nos níveis 1, 1, 4 e 8 (referência: learnset de Scarlet/Violet). O mapa do próximo capítulo começa no nível 5, quando o último golpe ainda não está disponível. Chama Giratória não é golpe inicial; surge somente em nível avançado. O plano de evolução, incluindo **Charmeleon no nível 16 e Charizard no 36**, está em `src/starterProgression.ts` com os próximos golpes desbloqueáveis. Efeitos aprimorados em `src/starterFx.ts`: cortes brilhantes, ondas sonoras, pulso de brasas e nuvem de fumaça volumosa.

Referências: https://pokemondb.net/pokedex/charmander/moves/9 , https://pokemondb.net/pokedex/charmeleon/moves/9 , https://pokemondb.net/pokedex/charmander .
