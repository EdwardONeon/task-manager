import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable, Subject, catchError, empty, switchMap, tap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WebReqInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) { }

  refreshingAccessToken: boolean = false;

  accessTokenRefreshed: Subject<any> = new Subject();


  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // handle the request
      req = this.addAuthHeader(req);

      //call next() and handle the response
      return next.handle(req).pipe(
        catchError((err: HttpErrorResponse) => {

          if(err.status == 401) {
            // error status is 401 meaning not authorized
            return this.refreshAccessToken().pipe(
              switchMap(() => {
                req = this.addAuthHeader(req);
                return next.handle(req);
              }),
              catchError((err: any) => {
                console.log(err)
                this.authService.logout();
                return EMPTY;
              })
            )
          }

          return throwError(()=>err);
        })
      )
  }

  refreshAccessToken() {
    if (this.refreshingAccessToken) {
       return new Observable(observer => {
        this.accessTokenRefreshed.subscribe(()=> {
          //this code will run when the access token has been refreshed
          observer.next();
          observer.complete();
        })
       })
    } else {
      this.refreshingAccessToken = true;
      // call method in the auth service to refresh the access token
      return this.authService.getNewAccessToken().pipe(
        tap(() => {
          this.refreshingAccessToken = false;
          console.log("Access token is refreshed!");
          this.accessTokenRefreshed.next(true);
        })
      );
    }

  }

  addAuthHeader(request: HttpRequest<any>) {
    // get the access token
    const token = this.authService.getAccessToken();

    if(token) {
      // append the access token to the request header
      return request.clone({
        setHeaders: {
          'x-access-token': token
        }
      })
    }
    return request;
  }
}
