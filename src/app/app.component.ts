import { Component, OnInit } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  private readonly LOCALSTORAGE_KEY = 'settings';

  formdata = {
    hubUrl: '',
    method: '',
    listen: new Array<string>()
  };
  body = '';

  log = '';

  hubConnection: HubConnection;

  connectionstate: 'disconnected' | 'disconnecting' | 'connected' | 'connecting' = 'disconnected';

  ngOnInit(): void {
    const settings = localStorage?.getItem(this.LOCALSTORAGE_KEY);
    if (settings) {
      this.formdata = JSON.parse(settings);
    }
  }

  async connect(): Promise<void> {
    this.connectionstate = 'connecting';
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(this.formdata.hubUrl)
      .withAutomaticReconnect()
      .build();

    this.hubConnection.onreconnecting(error => {
      this.connectionstate = 'connecting';
      this.addToLog('Reconnecting', error.message);
    });
    this.hubConnection.onreconnected((connid) => {
      this.connectionstate = 'connected';
      this.addToLog('Reconnected', `Connection ID: ${connid}`);
    });
    this.hubConnection.onclose(error => {
      this.connectionstate = 'disconnected';
      this.addToLog('Closed', error.message);
    });
    this.formdata.listen.forEach(item => this.addForListening(item, true));

    try {
      this.addToLog('Connecting', `URL: ${this.formdata.hubUrl}`);
      await this.hubConnection.start();
      this.connectionstate = 'connected';
      this.addToLog('Connected', `Connection ID: ${this.hubConnection.connectionId}`);
    } catch (e) {
      this.connectionstate = 'disconnected';
      this.addToLog('Error', e.message ?? e);
    }

  }

  async disconnect(): Promise<void> {
    try {
      this.addToLog('Disconnecting', `Connection ID: ${this.hubConnection.connectionId}`);
      this.connectionstate = 'disconnecting';
      await this.hubConnection.stop();
      this.addToLog('Disconnected', 'successful');
      this.connectionstate = 'disconnected';
    } catch (e) {
      this.connectionstate = 'disconnected';
      this.addToLog('Error', e.message ?? e);
    }
  }

  async invoke(): Promise<void> {
    try {
      const result = await this.hubConnection.invoke<string>(this.formdata.method, this.body);
      this.addToLog('Invoke success', (result) ? `with result: ${result}` : 'without result');
    } catch (e) {
      this.addToLog('Invoke failed', e.message ?? e);
    }
  }

  addForListening(value: string, noadd = false): void {
    if (!noadd) {
      if (this.formdata.listen.indexOf(value) === -1) {
        this.formdata.listen.push(value);
      } else {
        this.addToLog('Error', 'Listener already added');
      }
    }
    if (this.hubConnection) {
      this.hubConnection.on(value, message => {
        this.addToLog('hub method received', `'${value}': ${message}`);
      });
    }
  }

  removeFromListening(index: number): void {
    if (this.hubConnection) {
      this.hubConnection.off(this.formdata[index]);
    }
    this.formdata.listen.splice(index, 1);
  }

  addToLog(type: string, message: string): void {
    this.log = `${type} => ${message}\n${this.log}`;
  }

  saveSettings(): void {
    try {
      localStorage.setItem(this.LOCALSTORAGE_KEY, JSON.stringify(this.formdata));
      this.addToLog('Save settings success', 'saved in localstorage');
    } catch (e) {
      this.addToLog('Save settings failed', e.message ?? e);
    }
  }

  removeSettings(): void {
    try {
      localStorage.removeItem(this.LOCALSTORAGE_KEY);
      this.addToLog('Remove settings success', 'removed from localstorage');
    } catch (e) {
      this.addToLog('Remove settings failed', e.message ?? e);
    }
  }

}
