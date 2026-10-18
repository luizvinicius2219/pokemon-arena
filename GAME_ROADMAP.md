# Monster Arena — roteiro do capítulo 1 (MVP)

O ginásio de Pewter é uma **meta**, não a primeira tela. O jogador começa com um Pokémon pequeno e desenvolve estratégia, níveis e habilidades antes de enfrentar Brock. O jogo prioriza exploração top-down, encontros visíveis, ação em tempo real, esquiva, terreno e uso inteligente dos tipos, e **não copia o sistema de combate por turnos**.

## Jornada do jogador

| Marco | Área | Mecânica | Condição de progresso |
| --- | --- | --- | --- |
| 0 | Vila do Início / laboratório | Escolha entre Charmander, Squirtle e Bulbasaur. Inicial nível 5, tutorial de movimento/esquiva/ataque | Receber inicial |
| 1 | Trilha do Bosque | Exploração, encontros selvagens visíveis, primeira captura; batalhas opcionais para subir nível | Concluir tutorial de captura |
| 2 | Campo de Treinamento | Treinadores comuns e desafios de precisão, HP, recompensa de experiência e movimentos | Completar primeira luta contra treinador |
| 3 | Estrada de Pedra | Inimigos rochosos, objetos destrutíveis, cura e atalhos; testar resistência e fraquezas | Encontrar entrada de Pewter |
| 4 | Cidade de Pewter | NPCs, loja, cura, equipe/reserva, missões opcionais, porta do ginásio | Requisitos de tutorial cumpridos |
| 5 | Ginásio de Brock | Geodude (nível 12) e Onix (nível 14), fraquezas, Escavar, pedras quebráveis | Vencer os dois com sua equipe |
| 6 | Pós-ginásio | Insígnia, habilidade de travessia e acesso à próxima região | Receber recompensa |

## Regras de progressão

- Um Pokémon por vez em campo; equipe inicial com até **3** criaturas e reserva persistente.
- Nenhum Pokémon começa evoluído. A evolução é resultado de **XP + marcos de progresso**, não de liberar um personagem gratuito.
- Ganho de XP e nível muda HP, velocidade, resistências e desbloqueia movimentos em marcos determinados. Evitar ganho de poder sem teto.
- Encontros selvagens têm telegráficos legíveis, chance de fuga e **captura durante janelas de vulnerabilidade**; Pokémon de treinadores e líderes não são capturáveis.
- Zonas de treino oferecem rota alternativa contra desvantagem de tipos. Não exigir grind infinito para atravessar o capítulo.
- Salvar equipe, níveis, inventário, insígnias, posição e missões; mundo, combate e criaturas desacoplados.
- Cada Pokémon reutiliza **uma definição única** de atributos, sprites, golpes e tipos em exploração, combate, captura e tela de equipe.
- Aprimorar mobilidade, movimentação, câmera e combate para mobile. Preservar cenário estático e texturas leves no navegador.

## Ordem de desenvolvimento

1. **Starter jogável (agora):** Charmander substitui Charizard apenas no desafio de Pewter. Arena Livre mantém Charizard. O acesso ao ginásio continua como atalho de testes até existir a jornada.
2. **Tela de seleção:** implementar Squirtle e Bulbasaur com kits e VFX próprios. Escolher e persistir exatamente um inicial.
3. **Mapa explorável:** vila, trilha e campo de treino com câmera, colisão, NPCs e portais; manter o ginásio atual como cena conectável.
4. **Batalhas/XP:** encontro selvagem, treinador comum, experiência, níveis e desbloqueio de habilidades.
5. **Captura/equipe:** Pokébola, indicador de chances, captura contextual, reserva e troca controlada.
6. **Cidade/ginásio:** cura, loja, diálogos, gatilho para o chefe, insígnia e desbloqueio.
7. **Polimento:** variedade de encontros, música, som, acessibilidade, otimização, saves e testes móveis.

**Estado atual:** o starter Charmander jogável é a primeira entrega técnica. Os mapas e a tela de seleção são etapas futuras; nenhuma interface de mapa foi anunciada como pronta.
