import {injectIntl, FormattedMessage} from 'react-intl';
import React from 'react';

import Modal from '../Modal';

class ConfirmModal extends React.Component {
  handleDismissClick() {
    // this.props.dismiss();
  }

  getActions() {
    return [
      {
        clickHandler: () => {
          console.log('primary action');
        },
        content: this.props.intl.formatMessage({
          id: 'torrents.set.tags.button.set',
          defaultMessage: 'Set Tags'
        }),
        triggerDismiss: false,
        type: 'primary'
      }
    ];
  }

  renderContent() {
    return (
      <div className="modal__content">
        <FormattedMessage
          id="connectivity.modal.content"
          defaultMessage="Cannot connect to rTorrent. Please update the information now."
        />
      </div>
    );
  }

  render() {
    return (
      <Modal
        actions={this.getActions()}
        alignment="center"
        content={this.renderContent()}
        dismiss={this.handleDismissClick}
        heading={this.props.intl.formatMessage({
          id: 'connectivity.modal.title',
          defaultMessage: 'Connectivity Issue'
        })}
      />
    );
  }
}

export default injectIntl(ConfirmModal);