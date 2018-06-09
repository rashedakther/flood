import {
  Button,
  Form,
  FormError,
  FormRow,
  Panel,
  PanelContent,
  PanelHeader,
  PanelFooter,
  Textbox
} from 'flood-ui-kit';
import React from 'react';

import ClientActions from '../../actions/ClientActions';
import RtorrentConnectionTypeSelection from './RtorrentConnectionTypeSelection';

export default class ClientConnectionInterruption extends React.Component {
  state = {
    isTestingConnection: false
  };

  handleFormSubmit = ({formData}) => {
    console.log(formData);
  }

  handleTestButtonClick = () => {
    if (this.state.isTestingConnection) return;
    const formData = this.formRef.getFormData();

    this.setState({
      isTestingConnection: true
    }, () => {
      // TODO: Implement this method to test the client connection with the provided information.
      ClientActions.testClientConnection(formData).then(() => {
        this.setState({
          isTestingConnection: false
        });
      }).catch(() => {
        this.setState({
          isTestingConnection: false
        });
      });
    });
  }

  render() {
    return (
      <Panel spacing="large">
        <Form onSubmit={this.handleFormSubmit} ref={(ref) => this.formRef = ref}>
          <PanelHeader>
            <h1>Cannot connect to rTorrent</h1>
          </PanelHeader>
          <PanelContent>
            <RtorrentConnectionTypeSelection />
          </PanelContent>
          <PanelFooter hasBorder>
            <FormRow justify="end">
              <Button isLoading={this.state.isTestingConnection} priority="tertiary" onClick={this.handleTestButtonClick}>
                Test
              </Button>
              <Button type="submit">
                Do the thing
              </Button>
            </FormRow>
          </PanelFooter>
        </Form>
      </Panel>
    )
  }
}