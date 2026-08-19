interface GoogleCredentialResponse {
  credential?: string
}

interface PromptMomentNotification {
  isNotDisplayed(): boolean
  isSkippedMoment(): boolean
}

interface GoogleIdentity {
  initialize(config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    ux_mode?: 'popup' | 'redirect'
    auto_select?: boolean
  }): void
  prompt(
    listener?: (notification: PromptMomentNotification) => void,
  ): void
  renderButton(
    parent: HTMLElement,
    options: {
      type?: string
      theme?: string
      size?: string
      shape?: string
      text?: string
      width?: number
    },
  ): void
}

interface Window {
  google: {
    accounts: {
      id: GoogleIdentity
    }
  }
}
