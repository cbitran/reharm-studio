import { useTranslation } from 'react-i18next'

interface Section { title: string; content: string }

const PRIVACY_PT: Section[] = [
  { title: '1. Informações que coletamos', content: 'Coletamos apenas as informações necessárias para o funcionamento do serviço: endereço de e-mail, nome e projetos salvos. Não coletamos dados de áudio ou MIDI gerados.' },
  { title: '2. Como usamos suas informações', content: 'Suas informações são usadas exclusivamente para autenticação, sincronização de projetos e melhoria do produto. Não vendemos nem compartilhamos seus dados com terceiros.' },
  { title: '3. Armazenamento de dados', content: 'Os dados são armazenados de forma segura. Projetos salvos ficam no seu dispositivo (localStorage) no plano gratuito. No plano Pro, são sincronizados em servidores protegidos.' },
  { title: '4. Cookies', content: 'Usamos cookies apenas para manter sua sessão ativa e lembrar preferências como idioma e tema. Não usamos cookies de rastreamento ou publicidade.' },
  { title: '5. Seus direitos', content: 'Você pode solicitar a exclusão completa da sua conta e dados a qualquer momento através das configurações da conta ou pelo e-mail contato@reharm.studio.' },
  { title: '6. Contato', content: 'Para dúvidas sobre privacidade: contato@reharm.studio' },
]

const TERMS_PT: Section[] = [
  { title: '1. Aceitação dos termos', content: 'Ao usar o Reharm Studio, você concorda com estes termos. Se não concordar, não use o serviço.' },
  { title: '2. Uso do serviço', content: 'O Reharm Studio é uma ferramenta para criação musical. O conteúdo MIDI gerado é de sua propriedade. Você é responsável por garantir que o uso seja compatível com as leis de direitos autorais aplicáveis.' },
  { title: '3. Propriedade intelectual', content: 'O código, design e marca do Reharm Studio são protegidos por direitos autorais. Os MIDIs gerados pertencem ao usuário que os criou.' },
  { title: '4. Limitação de responsabilidade', content: 'O serviço é fornecido "como está". Não nos responsabilizamos por perdas decorrentes do uso ou impossibilidade de uso do serviço.' },
  { title: '5. Modificações', content: 'Podemos atualizar estes termos a qualquer momento. Mudanças significativas serão comunicadas por e-mail.' },
  { title: '6. Contato', content: 'contato@reharm.studio' },
]

const REFUND_PT: Section[] = [
  { title: 'Plano Gratuito', content: 'O plano gratuito não possui cobranças. Não há nada a reembolsar.' },
  { title: 'Plano Pro — Reembolso em 7 dias', content: 'Oferecemos reembolso total dentro de 7 dias corridos após a primeira compra, sem perguntas. Basta solicitar pelo e-mail contato@reharm.studio com o assunto "Reembolso".' },
  { title: 'Como solicitar', content: 'Envie um e-mail para contato@reharm.studio com:\n• Seu nome e e-mail cadastrado\n• Data da compra\n• Motivo (opcional)' },
  { title: 'Prazo de processamento', content: 'O reembolso é processado em até 5 dias úteis após a solicitação, diretamente no método de pagamento original.' },
  { title: 'Renovações', content: 'Renovações automáticas podem ser canceladas a qualquer momento nas configurações da conta, com efeito no próximo ciclo de cobrança.' },
]

type PageType = 'privacidade' | 'termos' | 'reembolso'

interface Props { page: PageType }

const PAGE_CONFIG = {
  privacidade: { titleKey: 'privacy.title', dateKey: 'privacy.lastUpdated', sections: PRIVACY_PT },
  termos:      { titleKey: 'terms.title',   dateKey: 'terms.lastUpdated',   sections: TERMS_PT },
  reembolso:   { titleKey: 'refund.title',  dateKey: 'refund.lastUpdated',  sections: REFUND_PT },
}

export function LegalPage({ page }: Props) {
  const { t } = useTranslation()
  const config = PAGE_CONFIG[page]

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-sans text-3xl font-bold mb-2" style={{ color: 'var(--color-ink)' }}>
        {t(config.titleKey)}
      </h1>
      <p className="font-mono text-xs mb-8" style={{ color: 'var(--color-muted)' }}>
        {t(config.dateKey)}
      </p>

      <div className="space-y-6">
        {config.sections.map((section, i) => (
          <div key={i} className="card p-5">
            <h2 className="font-sans text-base font-semibold mb-2" style={{ color: 'var(--color-ink)' }}>
              {section.title}
            </h2>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-muted)' }}>
              {section.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
