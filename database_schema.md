# Documentação de Classes e Schemas do Fit App Backend

Este documento lista todas as tabelas geradas no banco de dados, servindo como um dicionário de dados (Schema) para guiar o desenvolvimento do Frontend no consumo dos endpoints de CRUD dinâmico e na arquitetura do aplicativo em geral.

*Importante: Todas as tabelas possuem as colunas auxiliares opcionais/automáticas padrão como `id` (uuid), `created_at` (timestamptz) e `updated_at` (timestamptz) que foram omitidas da lista na sua grande maioria para simplificar a leitura dos dados que realmente devem ser trafegados.*

---

## 👥 1. Gestão de Usuários

### `professores`
Representa um treinador. Ele cadastra alunos, programas e faz avaliações.
- `nome` (texto)
- `email` (texto, único)
- `password_hash` (texto, criptografado)
- `biotipo` (enum: 'masculino', 'feminino')

### `alunos`
Representa o paciente/cliente que usa o app para ver seus treinos e auto avaliações.
- `nome` (texto)
- `email` (texto, único)
- `password_hash` (texto, criptografado)
- `biotipo` (enum: 'masculino', 'feminino')
- `professor_id` (uuid / ForeignKey) -> Qual professor é o dono desse aluno
- `data_nascimento` (data)
- `idade` (int, gerado automático)
- `faixa_etaria` (enum gerado automático: 'adolescente', 'adulto', 'idoso')

---

## 🏋️‍♂️ 2. Biblioteca de Treinos

### `programas`
Pacote/Estrutura Macro criada pelo Professor e que pode ser distribuída para múltiplos alunos.
- `professor_id` (uuid)
- `nome` (texto)
- `metodo` (enum: 'multiplas_series', 'bi_set', 'tri_set', 'piramide', 'drop_set', 'cluster_set', 'gvt', 'rest_pause', 'continuo_aerobio')
- `progressao` (enum: 'linear', 'ondulatoria')
- `semanas` (int, de 1 a 104)
- `descricao` (texto longo)

### `exercicios`
Catálogo universal de exercícios do app. Funciona como dropdown.
- `nome` (texto único)

### `treinos`
Relação que compõe as atividades de um programa na musculação. Uma linha equivale a UM exercício dentro do programa.
- `programa_id` (uuid)
- `ordem` (int) -> a ordem física dele na ficha
- `exercicio_id` (uuid / ForeignKey)
- `series` (int, 1 a 99)
- `reps_tempo` (texto) -> ex: "3x10", "1 min", "até a falha"
- `pct_1rm` (int, opcional) -> % de esforço de 0 a 100

### `programa_prescricao_aerobio`
Módulo extra opcional atrelado a um `programa`.
- `programa_id` (uuid, único para essa tabela)
- `tipo` (enum: 'continuo', 'hiit')
- `continuo_duracao_min`, `continuo_velocidade_kmh` (numeric) -> se for cardio contínuo
- `hiit_num_tiros`, `hiit_vel_esforco`, `hiit_tempo_esforco_seg`, `hiit_pausa_seg`, `hiit_vel_recuperacao` -> se for HIIT.

### `programa_alunos`
Tabela relacional. Associa 1 `programa` a 1 `aluno`.
- `aluno_id` (uuid)
- `programa_id` (uuid)
- `atribuido_em` (data)
- `observacao` (texto)

### `checkins_recuperacao_pre_treino`
Questionário diário/avulso que o aluno manda antes de cada dia de malhar.
- `aluno_id` (uuid)
- `programa_id` (uuid, opcional)
- `valor` (int, de 0 a 10) -> escala de recuperação
- `observacao` (texto)

---

## 📏 3. Avaliações e Medidas Composição

### `avaliacoes_antropometricas`
Folha completa de tirada de dobras e circunferências pelo professor.
- `aluno_id` (uuid)
- `professor_id` (uuid) -> Quem tirou as medidas
- `data_avaliacao` (data e hora)
- **Peso/Altura**: `peso_corporal_kg`, `estatura_cm`
- **Cálculos e Metas Automáticas ou via App**: `imc`, `rcq`, `risco_rcq`, `percentual_gordura`, `massa_magra_kg`, `peso_gordura_kg`
- **Circunferências (cm)**: `circ_pescoco_cm`, `circ_ombro_cm`, `circ_torax_cm`, `circ_cintura_cm`, `circ_abdomen_cm`, `circ_quadril_cm`, `circ_coxa_dir_cm`, `circ_coxa_esq_cm`, `circ_perna_dir_cm`, `circ_perna_esq_cm`, `circ_braco_relax_dir_cm`, `circ_braco_relax_esq_cm`, `circ_braco_contr_dir_cm`, `circ_braco_contr_esq_cm`, `circ_antebraco_dir_cm`, `circ_antebraco_esq_cm`
- **Dobras Cutâneas (mm)**: `dobra_subescapular_mm`, `dobra_tricipital_mm`, `dobra_bicipital_mm`, `dobra_axilar_media_mm`, `dobra_peitoral_mm`, `dobra_abdominal_mm`, `dobra_suprailiaca_mm`, `dobra_coxa_mm`, `dobra_perna_medial_mm`
- `observacoes` (texto)

---

## 🏃‍♀️ 4. Baterias Físicas, Aeróbicas e Performance

### `sessoes_bateria_fisica`
Cabeçalho / Mãe de um conjunto de testes feitos num respectivo dia.
- `aluno_id` (uuid)
- `professor_id` (uuid)
- `data_sessao` (data)
- `avaliacao_antropometrica_id` (uuid, opcional) -> caso queira atrelar com uma composição física feita também naquele dia.

### `testes_neuromotor`
Um dos testes atalhado a uma bateria `sessoes_bateria_fisica`. (Teste de Carga / Zonas)
- `sessao_id` (uuid)
- `tipo_teste` (texto, default 'predicao_1rm_10rm')
- `exercicio` (enum: 'supino_reto', 'agachamento', 'leg_press', 'levantamento_terra')
- `carga_utilizada_kg` (numeric)
- `repeticoes` (int)
- Cálculos Automáticos/App: `rm1_predito_kg`, `kg_zona_95`, `kg_zona_90`, `kg_zona_85`... até 50.

### `testes_aerobico_limiar`
Outro teste atrelado a `/sessoes_bateria`. (Um por sessão).
- `sessao_id` (uuid)
- `cooper_distancia_m`, `cooper_vo2` (numeric)
- `yoyo_distancia_final_m` (numeric)
- `bruce_tempo_rampa_min` (numeric)
- `conconi_velocidade_limiar`, `conconi_fc_limiar` (numeric e int)

### `testes_performance`
Outro teste atrelado a `/sessoes_bateria`. (Um por sessão).
- `sessao_id` (uuid)
- `impulsao_vertical_cm`, `impulsao_horizontal_cm` (numeric)
- `abdominais_1min`, `flexoes_bracos` (int)
- `banco_wells_cm` (numeric, flexibilidade)

---

## 🩺 5. Diagnósticos de Saúde (Autopreenchido Pelo Aluno)

### `diagnostico_questionarios`
Entrevista e anamnese de saúde e rotina do aluno respondidas livremente no App.
- `aluno_id` (uuid)
- `percepcao_saude_nota` (int, de 1 a 10)
- `qualidade_sono_nota` (int, de 1 a 10)
- `consumo_alcool` (texto livre)
- `tabagismo` (texto livre)

### `diagnostico_exames_sangue`
Painel com anotações literais sobre exames laboratoriais trazido pelo paciente.
- `aluno_id` (uuid)
- `serie_vermelha` (texto, bloco para: Hemoglobina, hematócrito...)
- `hormonios` (texto, bloco para: Testosterona, TSH, cortisol...)
- `indicadores_hepaticos` (texto, bloco para: TGO, TGP, Gama-GT...)
