import { Injectable } from '@angular/core';
import { PagSeguroDefaultOptions } from './pagseguro.defaults';
import { RequestOptions, Http, Headers } from '@angular/http';
import { PagSeguroOptions } from './pagseguro.options';
//import { Observable } from "rxjs/Observable";

import 'rxjs/add/operator/map';
import 'rxjs/add/operator/toPromise';
import { PagSeguroData } from './pagseguro.data';

declare var PagSeguroDirectPayment: any;

@Injectable()
export class PagSeguroService {

  private scriptLoaded: boolean;
  private options: PagSeguroOptions;
  public creditCardHash;
  private checkoutData: PagSeguroData;

  constructor(private http: Http) {
    this.options = PagSeguroDefaultOptions;
  }

  public setOptions(options: PagSeguroOptions) {
    this.options = Object.assign(PagSeguroDefaultOptions, options);
  }

  public getOptions(): PagSeguroOptions {
    return this.options;
  }

  /**
   * Carrega o <script> do PagSeguro no HEAD do documento
   */
  public loadScript(): Promise<any> {
    //console.debug('Will load options with URL', this.options.scriptURL);
    var promise = new Promise((resolve) => {
      if (this.options.loadScript && !this.scriptLoaded) {
        let script: HTMLScriptElement = document.createElement('script');
        script.addEventListener('load', r => resolve());
        script.src = this.options.scriptURL;
        document.head.appendChild(script);

        this.scriptLoaded = true;
      } else {
        console.debug('Script is already loaded. Skipping...');
        resolve();
      }
    });
    return promise;
  }


  /**
   * Inicia a sessao com o PagSeguro, invocando uma Firebase Function
   */
  //public startSession(): Observable<any> {
  public startSession(): Promise<any> {

    let headers = new Headers({ 'Content-Type': 'application/json' });
    let requestOptions = new RequestOptions({ headers: headers });

    //return this.http.get(this.options.remoteApi.sessionURL, requestOptions).map((res: Response) => res.json());
    return this.http.get(this.options.remoteApi.sessionURL, requestOptions).toPromise();
  }

  /**
   * Rexupera as opções de pagamento. 
   * Esta funcção deve ser chamada após já termos iniciado a sessão, pelo startSession()
   */
  public getPaymentMethods(amount: number): Promise<any> {
    var promise = new Promise((resolve, reject) => {
      // recupera as opçoes de pagamento através da API Javscript do PagSeguro
      PagSeguroDirectPayment.getPaymentMethods({
        amount: amount,
        success: function (response) {
          resolve(response);
        },
        error: function (response) {
          reject(response);
        }
      });
    });
    return promise;
  }

  /**
   * Recupera a bandeira do cartão através dos 6 primeiros numeros do cartão (PIN)
   */
  public getCardBrand(pin: string): Promise<any> {
    var promise = new Promise((resolve, reject) => {
      PagSeguroDirectPayment.getBrand({
        cardBin: pin,
        success: function (response) {
          resolve(response);
        },
        error: function (response) {
          reject(response);
        }
      });
    });
    return promise;
  }

  
  /**
   * Use esta função para definir os itens e valores que devem entrar no checkout do PagSeguro
   * O elemento importante aqui é o "items" - que devem ser os itens que sua aplicação está vendendo
   * @param data 
   */
  public setCheckoutData(data: PagSeguroData) {
    this.checkoutData = data;
  }

  /**
   * Função que realiza o pagamento com o PagSeguro.
   * Ela irá passar os dados resgatados, para uma Firebase Functio, que irá concluir o processo
   * 
   * @param data 
   */
  public checkout(data: PagSeguroData): Promise<any> {
    console.debug('Tentando checkout com os dados', data);
    data = Object.assign(data, this.checkoutData);
    console.debug('merge do checkoutData', data)
    // recupera o token do cartao de crédito
    //var promise = new Promise((resolve, reject) => {
      if (data.method == 'creditCard') {
        return this.createCardToken(data).then(result => {
          data.creditCard.token = result.card.token;
          return this._checkout(data);
        });
        /*
        .catch(error => {
          console.debug('error ao criar token do cartao', error);
          reject(error);
        });
        */
      } else {
        return this._checkout(data);
      }
    //});
    //return promise;
  }

  /**
   * Invoca a API do Firebase Function com todos os dados necessários
   * Essa API deverá chamar a função de /transactions do PagSeguro para concluir a transação
   * @param data
   */
  private _checkout(data: PagSeguroData): Promise<any> {
   /*
    var promise = new Promise((resolve, reject) => {
      console.debug('invocando a API com os dados', data);
      resolve('ok');
    });
    return promise;
    */

    console.debug('invocando a API com os dados.', data);

    let headers = new Headers({ 'Content-Type': 'application/json' });
    let requestOptions = new RequestOptions({ headers: headers });

    //return this.http.get(this.options.remoteApi.checkoutURL, requestOptions).map((res: Response) => res.json());
    return this.http.post(this.options.remoteApi.checkoutURL, JSON.stringify(data), requestOptions).toPromise();

  }

  /**
   * Cria um Token para o cartão de crédito informado
   * @param data 
   */
  public createCardToken(data: PagSeguroData): Promise<any> {
    var promise = new Promise((resolve, reject) => {
      PagSeguroDirectPayment.createCardToken({
        cardNumber: data.creditCard.cardNumber,
        cvv: data.creditCard.cvv,
        expirationMonth: data.creditCard.expirationMonth,
        expirationYear: data.creditCard.expirationYear,
        success: function (response) {
          resolve(response);
        },
        error: function (response) {
          reject(response);
        }
      });
    });
    return promise;
  }

  /*

  public store(dados: Dados) {

    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    let body = JSON.stringify({ dados });
    return this.http.post('http://www.suaApi.com.br/store', body, options)
      .map(res => res.json());
  }

  public cancel() {

    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    return this.http.get('http://www.suaApi.com.br/cancel', options)
      .map(res => res.json());
  }
  */


}
