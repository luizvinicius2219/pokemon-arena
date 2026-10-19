# Monster Arena — finalização da região de Pewter

**Direção aprovada:** Pokémon compacto e não linear. A proposta é uma Safari pequena que permite explorar, procurar encontros visíveis, treinar e desafiar Brock. Sem laboratório, diálogos longos ou passagens obrigatórias de cidade a cidade. Combates são **ação em tempo real**.

## Recursos jogáveis nesta versão

| Sistema | Situação |
| --- | --- |
| Menu + escolha do inicial | Charmander, Squirtle e Bulbasaur no nível 5; salvar/continuar |
| Dificuldade | Casual (menos HP/dano rival, +20% XP), Padrão e Desafio (HP/dano rival maiores, -10% XP) |
| Mundo Safari | Mato alto, Pokémon selvagem visível, encontro por botão ou caminhada, treinador, Brock |
| Arena específica para selvagens | Chão verde e clareiras naturais com árvores e mato, diferente da Arena Livre e do ginásio |
| Encontros | Rattata 29%, Pidgey 25%, Caterpie 16%, Weedle 12%, Spearow 8%, Jigglypuff 7%, Pikachu 3% |
| Golpes selvagens | Rattata (investida), pássaros (bicada/vento), insetos (seda/veneno), Jigglypuff (som) e Pikachu (eletricidade) |
| Progresso | XP por vitória; nível dos selvagens acompanha o jogador, ganho ajustado pelo desnível; barra e XP restante |
| Treinador da rota | 100 XP na vitória; cooldown real de **20 min**, persistido. Não pode ser explorado por rematch |
| Evolução dos iniciais | Charmander→Charmeleon, Squirtle→Wartortle e Bulbasaur→Ivysaur no nível 16 |
| Evoluções preparadas | Pidgey→Pidgeotto (18), Rattata→Raticate (20), Spearow→Fearow (20), Caterpie→Metapod (7), Weedle→Kakuna (7) |
| Ginásio de Brock | Geodude e Onix, tipos, movimento Escavar e terremoto; HP ajustado por nível e dificuldade |
| Recompensa | Insígnia da Pedra persistida ao vencer |
| Laboratório de treinamento | Escolha do Pokémon, oponente e nível 5–36 para comparar golpes, sem XP da campanha |

### Economia de XP

- Inicial nível 5. Fórmula de XP acumulada por nível: **26 × (nível − 5)²**. Para evoluir ao nível 16: **3.146 XP acumulados**.
- Vitórias no mato alto pagam XP pequeno, variável por espécie, nível do adversário, diferença de nível e dificuldade. Nem caminhar sozinho, nem fugir, nem perder geram XP.
- O treinador da rota não pode ser usado para subir níveis instantaneamente: oferece **100 XP** após vencer e passa **20 minutos** descansando.
- O Modo Treinamento permite definir nível artificial somente para **testes**, sem adulterar a campanha.
- A intenção é manter exploração/combate significativos. Valores devem ser ajustados após sessões reais com os três iniciais.

## O que ainda falta para Pewter estar 100% concluída

1. **Captura:** bolas, chance de captura com reação visual, custo/recurso limitado, limites de espécie e autenticação de posse; somente selvagens podem ser capturados.
2. **Equipe:** painel de três Pokémon, depósito, troca em campo e durante a batalha com a animação de Pokébola já existente.
3. **Evoluções na equipe:** depois da captura, permitir subir nível de espécies selvagens e usar Pidgeotto, Raticate, Fearow, Metapod e Kakuna com seus sprites próprios.
4. **Equilíbrio fino:** validar por nível/desafio os quatro ataques, alcance, velocidade, IA, XP e taxa de encontros; limites para evitar grind excessivo.
5. **Conteúdo da rota:** duas áreas menores ou atalhos, novos NPCs de batalha com cooldown próprio e pontos de recuperação.
6. **Teste mobile:** conferir hitbox, sprites à escala correta, layout vertical, desempenho de efeitos e persistência com múltiplos Pokémon.

**Somente depois:** Viridian / próxima cidade, novos líderes e encontros. O jogo deve crescer por pequenas zonas reutilizáveis.

## Referências do código

- `src/encounters.ts` — tabela e sorteio de encontros
- `src/gameBalance.ts` — regras de dificuldade
- `src/starterProgression.ts` — curva e linhas de evolução
- `src/playerCollection.ts` — coleção, XP, níveis e save
- `src/storyProgress.ts` — cooldown do treinador e progresso de Pewter
- `src/safariBattlefield.ts` — cenário exclusivo de mato alto
- `src/starterFx.ts` — VFX para Pokémon e estilos de ataques
- `src/arena.ts` — combate em tempo real, cálculo de dano e IA
- `src/trainingSetup.ts` — escolhas temporárias do modo laboratório

**Nota:** as linhas evolutivas de espécies selvagens estão modeladas, mas captura ainda não é jogável; o sistema não deve anunciar que o usuário possui espécies selvagens por simplesmente enfrentá-las.
