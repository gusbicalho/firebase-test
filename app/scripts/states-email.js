module.exports = 'gb.FirebaseTest';

angular.module('gb.FirebaseTest')
  .controller('EmailSignupController', EmailSignupController)
  .controller('EmailLoginController', EmailLoginController)
  .controller('EmailForgotController', EmailForgotController)
  .config(configStates)
  ;

var _ = require('lodash');

configStates.$inject = ['$stateProvider'];
function configStates($stateProvider) {
  $stateProvider
    .state('emailSignup', {
      template: SIGNUP_TEMPLATE,
      controller: 'EmailSignupController',
      controllerAs: 'ctrl'
    })
    .state('emailLogin', {
      template: LOGIN_TEMPLATE,
      controller: 'EmailLoginController',
      controllerAs: 'ctrl'
    })
    .state('emailForgot', {
      template: FORGOT_TEMPLATE,
      controller: 'EmailForgotController',
      controllerAs: 'ctrl'
    })
    ;
}

function EmailLoginController(Auth, $state) {
  var ctrl = this;

  ctrl.submit = function() {
    Auth.loginPassword(ctrl.email, ctrl.password)
      .then(function(authData) {
        $state.go('index');
      })
      .catch(function(reason) {
        alert(reason.message);
        console.error(reason);
      });
  };
}

function EmailSignupController(Auth, $state) {
  var ctrl = this;

  ctrl.submit = function() {
    Auth.signupPassword(ctrl.email, ctrl.password)
    .then(function(result) {
      alert('Account created. Now, log in.');
      $state.go('emailLogin');
    })
    .catch(function(reason) {
      alert('Error creating account.');
      console.error(reason);
    });
  };
}

function EmailForgotController(Auth, $state) {
  var ctrl = this;

  ctrl.submit = function() {
    Auth.forgotPassword(ctrl.email)
    .then(function(result) {
      alert('Password reset e-mail sent. Now, log in using the password in that e-mail.');
      $state.go('emailLogin');
    })
    .catch(function(reason) {
      alert('Error sending password reset email.');
      console.error(reason);
    });
  };
}

var LOGIN_TEMPLATE = [
  '<h2>Login</h2>',
  '<form ng-submit="ctrl.submit()">',
    '<input type="email" name="email" placeholder="Email" ng-model="ctrl.email"><br>',
    '<input type="password" name="password" ng-model="ctrl.password"><br>',
    '<input type="submit"> <a ui-sref="emailForgot">Forgot my password</a>',
  '</form>'
  ].join('');

var SIGNUP_TEMPLATE = [
  '<h2>Sign up</h2>',
  '<form ng-submit="ctrl.submit()">',
    '<input type="email" name="email" placeholder="Email" ng-model="ctrl.email"><br>',
    '<input type="password" name="password" ng-model="ctrl.password"><br>',
    '<input type="submit">',
  '</form>'
  ].join('');

var FORGOT_TEMPLATE = [
  '<h2>Forgot your password</h2>',
  '<form ng-submit="ctrl.submit()">',
    '<input type="email" name="email" placeholder="Email" ng-model="ctrl.email"><br>',
    '<button type="submit">Recover</button>',
  '</form>'
  ].join('');
