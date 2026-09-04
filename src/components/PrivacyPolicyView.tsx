import React, { useState } from "react";
import { 
  ShieldCheck, 
  ArrowLeft, 
  Copy, 
  Check, 
  Printer, 
  ExternalLink, 
  Mail, 
  Globe, 
  Lock, 
  Eye, 
  Database, 
  UserCheck, 
  FileText, 
  AlertCircle,
  Building2,
  Calendar,
  Sparkles
} from "lucide-react";

interface PrivacyPolicyViewProps {
  onBack: () => void;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
}

export default function PrivacyPolicyView({ onBack, theme = "dark", onToggleTheme }: PrivacyPolicyViewProps) {
  const [copied, setCopied] = useState(false);

  const fullPolicyText = `Política de Privacidade – CalanguS
Última atualização: Setembro de 2026 (Versão 2.8)

Esta Política de Privacidade descreve como o aplicativo CalanguS ("nós", "nosso" ou "aplicativo"), desenvolvido por Philippe Wagner M R Araujo, coleta, utiliza, armazena e compartilha dados dos usuários ("você"), em conformidade com as diretrizes do Google Play e com a legislação aplicável (como a Lei Geral de Proteção de Dados Pessoais - LGPD, Lei nº 13.709/2018).

1. Informações que Coletamos
O CalanguS coleta apenas as informações estritamente necessárias para o funcionamento, coordenação logística de exames oficiais (como o ENEM e exames educacionais) e aprimoramento contínuo de suas funcionalidades:

a) Informações fornecidas diretamente pelo usuário:
- Dados de Cadastro e Identificação Funcional: Nome completo, endereço de e-mail, número de telefone celular/WhatsApp, data de nascimento e ocupação/formação fornecidos durante o credenciamento de fiscais, colaboradores e coordenadores de local de aplicação (CLA).
- Identificação Visual para Exame: Fotografia de perfil ou documento funcional enviada voluntariamente para confecção de crachás digitais, identificação presencial no dia do exame e auditoria de presença.
- Dados de Repasse Financeiro / Pagamento: Chave Pix e dados bancários informados voluntariamente para viabilizar o pagamento e repasse de diárias de atuação como colaborador ou fiscal.
- Credenciais de Acesso: Endereço de e-mail e senhas criptografadas administradas via Google Firebase Authentication ou provedores seguros OAuth (Google / Apple).
- Conteúdo Operacional e Registros no Exame: Confirmação de presença em sala (Dia 1 e Dia 2), respostas a comunicados e convocações oficiais, conferência de alimentação/lanches, recusa justificada de atribuição e registros de auditoria interna da coordenação.

b) Informações coletadas automaticamente e permissões do dispositivo:
- Identificadores e Dados do Dispositivo: Modelo do aparelho, versão do sistema operacional Android ou navegador web, dados de conectividade e registros de sincronização segura em tempo real.
- Diagnóstico e Desempenho: Relatórios técnicos anônimos de falhas (crash logs), latência de rede e cache operacional local para permitir o funcionamento resiliente do aplicativo em locais com instabilidade de conexão.
- Permissões de Hardware e Sistema: O aplicativo solicita permissões estritamente quando indispensáveis para o recurso em execução, mediante consentimento explícito do usuário:
  * Câmera: Utilizada exclusivamente para a captura voluntária de foto para o crachá/perfil do colaborador ou leitura óptica (OCR) de escalas de salas. O aplicativo não aciona a câmera em segundo plano.
  * Armazenamento / Galeria: Utilizado exclusivamente para upload de fotos e exportação/impressão de documentos oficiais (relatórios de ensalamento, atas e listas de frequência).
  * Notificações: Utilizadas para entrega de comunicados operacionais urgentes e avisos de escala emitidos pela coordenação.
  * Nota de Transparência: O CalanguS NÃO coleta localização precisa por GPS em segundo plano, NÃO acessa microfone e NÃO acessa contatos do aparelho.

2. Como Utilizamos as Informações
Os dados coletados pelo CalanguS possuem finalidades legítimas, institucionais e operacionais:
- Executar e manter as ferramentas de ensalamento, distribuição de salas, substituição de reservas e conferência de presença em dias de prova.
- Gerar atas, crachás digitais e relatórios gerenciais para a Coordenação de Local de Aplicação (CLA) e supervisão geral.
- Viabilizar a comunicação ágil entre coordenação e colaboradores (avisos de escala, chamadas de reserva e comunicados de segurança).
- Garantir a integridade, rastreabilidade e segurança dos processos do exame por meio de logs de auditoria detalhados.
- Diagnosticar falhas técnicas e aprimorar a estabilidade do sistema.
- Cumprir obrigações legais, regulatórias e fiscais inerentes à realização de concursos e exames oficiais.
Importante: Não vendemos, não alugamos e não comercializamos dados pessoais de nossos usuários para terceiros, anunciantes ou corretores de dados (data brokers).

3. Compartilhamento de Dados com Terceiros
Os dados podem ser compartilhados unicamente com prestadores de serviços de infraestrutura certificados e necessários para o funcionamento seguro do aplicativo:
- Provedores de Banco de Dados e Nuvem: Google Cloud Platform e Firebase (Firestore Database, Firebase Authentication e Cloud Storage), que utilizam criptografia de ponta a ponta e controle estrito de regras de acesso (Row-Level Security).
- Serviços de Inteligência Artificial e OCR (Opcional): Google Gemini API, acionado exclusivamente quando o usuário solicita a leitura óptica de documentos de ensalamento através de chave configurada. Nenhum dado pessoal é utilizado para treinamento de modelos públicos de IA.
- Ausência Total de Publicidade: O CalanguS não contém anúncios e não compartilha dados com redes de publicidade (como Google AdMob ou similares).
- Obrigações Legais: Em caso de ordens judiciais ou exigências formais emanadas por autoridades públicas competentes.

4. Retenção e Exclusão de Dados
- Período de Armazenamento: Os dados são retidos durante o ciclo de planejamento, execução e homologação do exame oficial, bem como pelo período legalmente exigido para fins de comprovação de prestação de serviços, repasse financeiro e auditoria institucional.
- Direito de Exclusão (Data Deletion - LGPD / Google Play): O usuário titular pode solicitar a exclusão de seus dados pessoais ou encerramento de sua conta a qualquer momento. Para isso, envie um e-mail para philippewagnermra@gmail.com com o assunto "Solicitação de Exclusão de Dados - CalanguS", informando seu nome completo e e-mail cadastrado. As solicitações serão processadas e respondidas em até 15 (quinze) dias úteis, ressalvadas as obrigações legais de guarda documental decorrentes de processos licitatórios e concursos públicos.

5. Segurança das Informações
Adotamos rigorosas medidas técnicas e organizacionais compatíveis com os padrões da indústria para resguardar seus dados contra acesso não autorizado, extravio ou alteração indevida:
- Comunicação 100% criptografada via protocolo HTTPS/TLS de alta segurança.
- Controle de acesso baseado em perfis e papéis (RBAC), restringindo a visualização de dados apenas a coordenadores autorizados do respectivo local de aplicação.
- Criptografia de credenciais gerenciada pelo Google Firebase Authentication.
- Não retenção de dados sensíveis fora do escopo funcional estritamente necessário.

6. Privacidade de Crianças e Adolescentes
O CalanguS é um aplicativo profissional voltado para a coordenação de equipes de aplicação de exames oficiais, destinado exclusivamente a colaboradores maiores de 18 anos.
O aplicativo não é direcionado a crianças ou adolescentes e não coleta intencionalmente dados pessoais dessa faixa etária. Caso seja identificada qualquer submissão involuntária por menor, os respectivos registros serão prontamente excluídos de nossos servidores.

7. Alterações nesta Política de Privacidade
Podemos atualizar esta Política de Privacidade periodicamente para refletir mudanças no aplicativo, diretrizes do Google Play ou atualizações na legislação vigente (LGPD). A data da versão mais recente estará sempre indicada no topo deste documento.

8. Contato e Encarregado de Dados (DPO)
Em caso de dúvidas, solicitações ou considerações sobre esta Política de Privacidade ou sobre o tratamento de seus dados pessoais, entre em contato com o desenvolvedor responsável:
- Desenvolvedor: Philippe Wagner M R Araujo
- E-mail de Contato/Privacidade: philippewagnermra@gmail.com
- Site Oficial: https://calangus.vercel.app
- Versão: v2.8 (Setembro de 2026)`;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(fullPolicyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Falha ao copiar:", err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b13] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Background Glow (Dark Mode) */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[350px] bg-radial from-emerald-500/10 via-indigo-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* STICKY TOPBAR / CONTROLS (Hidden on Print) */}
      <header className="no-print sticky top-0 z-40 bg-white/90 dark:bg-[#0c1220]/90 backdrop-blur-md border-b-2 border-slate-200 dark:border-slate-800 py-3.5 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-extrabold text-xs transition cursor-pointer border border-slate-300 dark:border-slate-700 shadow-xs"
            title="Voltar ao início do CalanguS"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-500" />
            <span>Voltar ao Sistema</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Direct address badge */}
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <Globe className="w-3 h-3 text-emerald-500" />
              <span>/privacy</span>
            </span>

            {/* Print button */}
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer border border-slate-300 dark:border-slate-700 flex items-center gap-1.5"
              title="Imprimir ou Salvar como PDF"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span className="hidden md:inline">Imprimir / PDF</span>
            </button>

            {/* Copy full text button */}
            <button
              type="button"
              onClick={handleCopyText}
              className={`px-3 py-2 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs border ${
                copied 
                  ? "bg-emerald-600 text-white border-emerald-600" 
                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
              }`}
              title="Copiar texto completo para o Google Play Console ou documentação"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white stroke-[3]" />
                  <span>Texto Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-emerald-500" />
                  <span className="hidden sm:inline">Copiar Texto da Política</span>
                  <span className="sm:hidden">Copiar</span>
                </>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* MAIN DOCUMENT CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">

        {/* HERO TITLE CARD */}
        <div className="bg-white dark:bg-[#0c1220] p-6 sm:p-10 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-[8px_8px_0px_0px_#e2e8f0] dark:shadow-[8px_8px_0px_0px_rgba(16,185,129,0.15)] relative overflow-hidden">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <img 
                src="/CalanguS-logo-Noname.png" 
                referrerPolicy="no-referrer"
                alt="Logo CalanguS" 
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0 drop-shadow-md"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-slate-900 dark:text-white">
                    Política de Privacidade
                  </h1>
                  <span className="text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono font-black px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    CalanguS v2.8
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  Diretrizes de Proteção de Dados, LGPD & Conformidade Google Play
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400">
                Última Atualização
              </span>
              <span className="text-xs font-mono font-black px-3 py-1 bg-slate-100 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-750 text-slate-750 dark:text-slate-250 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>Setembro de 2026</span>
              </span>
            </div>
          </div>

          {/* Quick highlights grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-emerald-600 dark:text-emerald-400 uppercase text-[10px] tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Conformidade LGPD</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                Respeito integral à Lei Geral de Proteção de Dados (Lei 13.709/18).
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-indigo-600 dark:text-indigo-400 uppercase text-[10px] tracking-wider">
                <Lock className="w-4 h-4" />
                <span>Zero Publicidade</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                Sem anúncios, sem rastreamento comercial e sem venda para terceiros.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-amber-600 dark:text-amber-400 uppercase text-[10px] tracking-wider">
                <UserCheck className="w-4 h-4" />
                <span>Direito de Exclusão</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                Canal direto de exclusão de dados em até 15 dias úteis.
              </p>
            </div>
          </div>

          {/* INTRODUCTORY TEXT */}
          <div className="mt-6 p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
            Esta Política de Privacidade descreve como o aplicativo <strong>CalanguS</strong> (&quot;nós&quot;, &quot;nosso&quot; ou &quot;aplicativo&quot;), desenvolvido por <strong>Philippe Wagner M R Araujo</strong>, coleta, utiliza, armazena e compartilha dados dos usuários (&quot;você&quot;), em estrita conformidade com as diretrizes de segurança e privacidade do <strong>Google Play</strong> e com a legislação aplicável no Brasil (especialmente a <strong>LGPD - Lei Geral de Proteção de Dados Pessoais, Lei nº 13.709/2018</strong>).
          </div>
        </div>

        {/* QUICK INDEX / SUMMARY TABLE */}
        <nav aria-label="Sumário da Política de Privacidade" className="p-5 bg-white dark:bg-[#0c1220] rounded-3xl border-2 border-slate-200 dark:border-slate-800 space-y-3 no-print">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            <span>Sumário das Seções</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-bold">
            {[
              { id: "sec-1", num: "1", title: "Informações que Coletamos" },
              { id: "sec-2", num: "2", title: "Como Utilizamos os Dados" },
              { id: "sec-3", num: "3", title: "Compartilhamento com Terceiros" },
              { id: "sec-4", num: "4", title: "Retenção e Exclusão de Dados" },
              { id: "sec-5", num: "5", title: "Segurança das Informações" },
              { id: "sec-6", num: "6", title: "Menores de Idade (18+)" },
              { id: "sec-7", num: "7", title: "Alterações desta Política" },
              { id: "sec-8", num: "8", title: "Contato e Encarregado (DPO)" },
            ].map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-500/10 dark:bg-slate-900/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200/80 dark:border-slate-800 transition flex items-center gap-2"
              >
                <span className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-black text-[10px] flex items-center justify-center shrink-0">
                  {item.num}
                </span>
                <span className="truncate">{item.title}</span>
              </a>
            ))}
          </div>
        </nav>

        {/* SECTION 1: INFORMAÇÕES QUE COLETAMOS */}
        <section id="sec-1" className="bg-white dark:bg-[#0c1220] p-6 sm:p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm flex items-center justify-center shrink-0">
              1
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-display">
                Informações que Coletamos
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Princípio da Necessidade e Minimização de Dados (Art. 6º, III da LGPD)
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            O <strong>CalanguS</strong> coleta unicamente as informações estritamente necessárias para a gestão, coordenação e atuação de fiscais e equipes operacionais de exames oficiais (como o ENEM e concursos educacionais):
          </p>

          <div className="space-y-4 pt-2">
            {/* Subsection a */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span className="text-emerald-500 font-mono">a)</span> Informações Fornecidas Diretamente pelo Usuário
              </h3>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed list-disc list-inside">
                <li>
                  <strong>Dados Cadastrais e de Identificação:</strong> Nome completo, endereço de e-mail, número de telefone celular/WhatsApp, data de nascimento e grau de escolaridade informados voluntariamente durante o credenciamento de fiscais ou no cadastro de membros da Coordenação de Local de Aplicação (CLA).
                </li>
                <li>
                  <strong>Fotografia de Identificação Funcional:</strong> Imagem de rosto enviada pelo colaborador para a geração de crachás digitais, identificação presencial e controle de acesso no dia do exame, prevenindo fraudes de personificação.
                </li>
                <li>
                  <strong>Dados de Repasse Financeiro:</strong> Chave Pix ou informações bancárias fornecidas exclusivamente para viabilizar o pagamento e repasse de diárias de trabalho decorrentes da prestação do serviço no exame.
                </li>
                <li>
                  <strong>Credenciais de Conta:</strong> Endereço de e-mail e senha criptografada gerenciados com segurança no Google Firebase Authentication ou via login federado seguro (Google / Apple).
                </li>
                <li>
                  <strong>Registros Operacionais e Respostas:</strong> Confirmação de presença em sala (Dia 1 e Dia 2), respostas a comunicados oficiais, formulários de justificativa em caso de recusa de função e logs de auditoria de escala.
                </li>
              </ul>
            </div>

            {/* Subsection b */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span className="text-emerald-500 font-mono">b)</span> Informações Coletadas Automaticamente e Permissões do Dispositivo
              </h3>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed list-disc list-inside">
                <li>
                  <strong>Dados do Dispositivo e Conectividade:</strong> Tipo de aparelho, versão do sistema operacional (Android, iOS ou navegador web), endereço IP e dados de conexão necessários para a sincronização segura de dados com o banco de dados.
                </li>
                <li>
                  <strong>Diagnóstico e Cache de Resiliência:</strong> Registros técnicos e cache operacional local para garantir que os dados de ensalamento e listas de presença continuem operacionais mesmo sob instabilidade de sinal de internet nos locais de prova.
                </li>
                <li>
                  <strong>Permissões de Hardware e Sistema (Sob Consentimento Explícito):</strong>
                  <div className="mt-2 ml-4 space-y-1.5 border-l-2 border-emerald-500/30 pl-3">
                    <p>
                      • <strong>Câmera:</strong> Solicitada unicamente quando o usuário decide fotografar seu rosto para o crachá funcional ou acionar o leitor óptico (OCR) de documentos de salas. <em>O CalanguS não tem acesso contínuo à câmera nem grava vídeo em segundo plano.</em>
                    </p>
                    <p>
                      • <strong>Armazenamento / Galeria:</strong> Solicitado para selecionar fotos já tiradas ou salvar relatórios em PDF gerados no aplicativo.
                    </p>
                    <p>
                      • <strong>Notificações:</strong> Para alertas operacionais imediatos sobre convocações, alterações de sala e comunicados institucionais da coordenação.
                    </p>
                  </div>
                </li>
              </ul>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Transparência Garantida:</strong> O CalanguS <strong>NÃO</strong> rastreia localização por GPS em segundo plano, <strong>NÃO</strong> grava áudio/microfone e <strong>NÃO</strong> lê a agenda de contatos do seu dispositivo.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: COMO UTILIZAMOS AS INFORMAÇÕES */}
        <section id="sec-2" className="bg-white dark:bg-[#0c1220] p-6 sm:p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm flex items-center justify-center shrink-0">
              2
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-display">
                Como Utilizamos as Informações
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Finalidades Legítimas e Específicas (Art. 6º, I da LGPD)
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Os dados coletados pelo CalanguS são processados estritamente para as seguintes finalidades legítimas e contratuais:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 block">
                🎯 Ensalamento e Gestão de Fiscais
              </span>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Distribuir colaboradores por salas, corredores, apoio e reserva técnica, otimizando o quadro de pessoal nos locais de exame.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 block">
                📋 Registro de Frequência e Atas
              </span>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Registrar a pontualidade, confirmação de presença e substituições em tempo real para a elaboração das atas oficiais do exame.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 block">
                💬 Mensageria e Convocação Oficial
              </span>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Permitir que a coordenação envie comunicados operacionais importantes, orientações de segurança e chamadas de contingência.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 block">
                🛡️ Auditoria, Segurança e Pagamentos
              </span>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Resguardar o processo com trilhas de auditoria imutáveis e garantir a exatidão no repasse de pagamentos aos prestadores.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-800 dark:text-emerald-200 leading-relaxed">
            🛡️ <strong>Compromisso de Não Comercialização:</strong> Em hipótese alguma vendemos, alugamos, licenciamos ou comercializamos dados pessoais de usuários com corretores de dados (data brokers), empresas de publicidade ou terceiros não autorizados.
          </div>
        </section>

        {/* SECTION 3: COMPARTILHAMENTO DE DADOS COM TERCEIROS */}
        <section id="sec-3" className="bg-white dark:bg-[#0c1220] p-6 sm:p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm flex items-center justify-center shrink-0">
              3
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-display">
                Compartilhamento de Dados com Terceiros
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Infraestrutura de Nuvem Homologada e Estrita Necessidade
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Os dados processados pelo aplicativo são mantidos em ambientes de nuvem protegidos e compartilhados exclusivamente com fornecedores essenciais à operação:
          </p>

          <div className="space-y-3 pt-2 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                  Google Cloud Platform & Firebase
                </span>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full font-mono text-slate-600 dark:text-slate-400 font-bold">
                  Infraestrutura Central
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Utilizado para o banco de dados em nuvem em tempo real (Firestore), autenticação criptografada de usuários (Firebase Auth) e hospedagem de mídias/crachás (Cloud Storage). Toda comunicação é cifrada via HTTPS/TLS e as regras de segurança impedem que usuários não autorizados leiam dados de outras instituições.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                  Google Gemini API (Opcional sob Chave Pessoal)
                </span>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full font-mono text-slate-600 dark:text-slate-400 font-bold">
                  OCR / Leitura Óptica
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Acionado exclusivamente quando o coordenador opta por digitalizar documentos físicos de ensalamento através de OCR. Os dados de imagem enviados são processados de forma privada na sessão e <strong>não são utilizados para alimentar ou treinar modelos públicos de IA</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                  Ausência Total de Redes de Anúncios
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  Zero AdMob
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                O CalanguS <strong>não contém anúncios publicitários</strong> e <strong>não integra SDKs de redes de anúncios</strong> como Google AdMob, Unity Ads ou similares. Seus dados nunca são transferidos para monetização de mídia.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm block">
                Obrigações e Cumprimento Legal
              </span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Poderemos divulgar dados caso exigido por ordem judicial fundamentada, processo legal formal ou requisição emanada por autoridade policial ou governamental competente, em conformidade com o Artigo 7º, II da LGPD.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 4: RETENÇÃO E EXCLUSÃO DE DADOS */}
        <section id="sec-4" className="bg-white dark:bg-[#0c1220] p-6 sm:p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm flex items-center justify-center shrink-0">
              4
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-display">
                Retenção e Exclusão de Dados
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Direito de Exclusão do Titular (LGPD Art. 18 & Google Play Data Deletion)
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              <strong>Período de Armazenamento:</strong> Seus dados são mantidos durante o período de planejamento, execução e homologação final das avaliações educacionais aplicadas, além do prazo legal estritamente exigido para prestação de contas financeiras, pagamento de diárias e auditoria de órgãos fiscalizadores de concursos públicos.
            </p>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <span>Como Solicitar a Exclusão dos Seus Dados (Data Deletion)</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Qualquer usuário cadastrado pode exercer a qualquer momento o direito à eliminação de seus dados pessoais armazenados em nossos servidores. Para formalizar a solicitação, siga os passos abaixo:
              </p>
              
              <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <Mail className="w-4 h-4" />
                  <span>Envie um e-mail para: <strong>philippewagnermra@gmail.com</strong></span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  <strong>Assunto:</strong> Solicitação de Exclusão de Dados - CalanguS<br />
                  <strong>Corpo do E-mail:</strong> Informe seu nome completo, CPF e o e-mail que utilizou para o cadastro no aplicativo.
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>
                  <strong>Prazo de Atendimento:</strong> A exclusão de cadastros e fotografias é processada e confirmada em até <strong>15 (quinze) dias úteis</strong>, salvo retenção obrigatória de comprovantes de pagamento e atas exigidas pela legislação fiscal e de auditoria de exames.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: SEGURANÇA DAS INFORMAÇÕES */}
        <section id="sec-5" className="bg-white dark:bg-[#0c1220] p-6 sm:p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm flex items-center justify-center shrink-0">
              5
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-display">
                Segurança das Informações
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Padrões Técnicos e Organizacionais de Proteção
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Adotamos medidas modernas de segurança cibernética para resguardar a integridade, confidencialidade e disponibilidade dos dados:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-500" />
                <span>Criptografia em Trânsito (TLS/HTTPS)</span>
              </span>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Todas as requisições entre o aplicativo e a nuvem são protegidas por protocolos modernos de criptografia de ponta a ponta.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-500" />
                <span>Controle de Acesso por Função (RBAC)</span>
              </span>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Regras de segurança no banco de dados garantem que apenas coordenadores autorizados possam visualizar listas e escalas de sua jurisdição.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Senhas Criptografadas</span>
              </span>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Senhas de acesso são processadas através de algoritmos criptográficos irreversíveis (hashing com salt) gerenciados pelo Google Identity.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                <span>Trilhas de Auditoria (Logs)</span>
              </span>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Alterações em escalas, substituições de reservas e aprovações cadastrais são registradas com carimbo de tempo e identificação do operador.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 6: PRIVACIDADE DE CRIANÇAS E ADOLESCENTES */}
        <section id="sec-6" className="bg-white dark:bg-[#0c1220] p-6 sm:p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm flex items-center justify-center shrink-0">
              6
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-display">
                Privacidade de Crianças e Adolescentes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Público-Alvo Adulto e Profissional (Não Direcionado a Menores)
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              O <strong>CalanguS</strong> é uma ferramenta profissional estritamente destinada à coordenação logística e atuação de fiscais de sala e membros de apoio institucional em exames oficiais, cuja atuação exige <strong>maioridade civil (idade igual ou superior a 18 anos)</strong>.
            </p>
            <p>
              Portanto, o aplicativo <strong>não é direcionado a crianças ou adolescentes</strong> e não coleta intencionalmente dados de menores de 18 anos. Caso venha a ser identificado qualquer cadastro realizado por engano ou inadvertidamente por menor de idade, os registros associados serão imediata e permanentemente excluídos de nossos bancos de dados.
            </p>
          </div>
        </section>

        {/* SECTION 7: ALTERAÇÕES NESTA POLÍTICA */}
        <section id="sec-7" className="bg-white dark:bg-[#0c1220] p-6 sm:p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm flex items-center justify-center shrink-0">
              7
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-display">
                Alterações nesta Política de Privacidade
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Revisões e Transparência Contínua
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Podemos atualizar esta Política de Privacidade periodicamente para refletir aprimoramentos nos recursos operacionais do aplicativo, alterações em diretrizes do Google Play Console ou adequações legislativas na LGPD.
          </p>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Recomendamos que você consulte esta página com regularidade. A versão vigente e a data de sua última atualização sempre constarão de forma clara no topo deste documento.
          </p>
        </section>

        {/* SECTION 8: CONTATO E ENCARREGADO DE DADOS */}
        <section id="sec-8" className="bg-white dark:bg-[#0c1220] p-6 sm:p-10 rounded-3xl border-2 border-emerald-500/30 shadow-[8px_8px_0px_0px_rgba(16,185,129,0.1)] space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="w-8 h-8 rounded-xl bg-emerald-500 text-white font-mono font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
              8
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-display">
                Contato e Encarregado de Dados (DPO)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Canal Oficial de Atendimento ao Titular
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Em caso de dúvidas, solicitações sobre seus dados pessoais, esclarecimentos ou considerações acerca desta Política de Privacidade, entre em contato direto com o desenvolvedor responsável:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">
                Desenvolvedor / Responsável
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white block">
                Philippe Wagner M R Araujo
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                Desenvolvedor & Mantenedor
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">
                E-mail de Contato / Privacidade
              </span>
              <a 
                href="mailto:philippewagnermra@gmail.com?subject=Solicita%C3%A7%C3%A3o%20de%20Privacidade%20-%20CalanguS"
                className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline block break-all"
              >
                philippewagnermra@gmail.com
              </a>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                Atendimento em até 15 dias úteis
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">
                Site Oficial & Plataforma
              </span>
              <a 
                href="https://calangus.vercel.app" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>calangus.vercel.app</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                Versão v2.8 (Build 2026)
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold text-center sm:text-left">
              CalanguS – Sistema de Coordenação & Aplicação de Exames © 2026. Todos os direitos reservados.
            </div>

            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao CalanguS</span>
            </button>
          </div>
        </section>

      </main>
    </div>
  );
}
