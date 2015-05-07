module.exports = 'gb.FirebaseTest';

angular.module('gb.FirebaseTest')
  .config(configStates);

configStates.$inject = ['$stateProvider'];
function configStates($stateProvider) {
  $stateProvider
    .state('messages', {
      url: '/messages',
      template: TEMPLATE,
      resolve: {
        User: ['Auth', function(Auth) {
          return Auth.getUser();
        }],
        authData: ['Auth', function(Auth) {
          return Auth.waitForAuth();
        }]
      },
      controller: Controller,
      controllerAs: 'ctrl'
    })
    ;
}

function Controller(Auth, User, authData, $state) {
  var ctrl = this;
  console.log('messages ctrl',User,authData);
  if (User)
    ctrl.msgsRef = User.$ref().child('messages').toString();
  
  var offAuth = Auth.onAuth(function(newAuthData) {
    if ((!!newAuthData !== !!authData) ||
        (newAuthData && authData && newAuthData.uid !== authData.uid)) {
      offAuth();
      $state.reload('messages');
    }
  });
}

var TEMPLATE = [
  '<h2>Messages</h2>',
  'MsgsRef: {{ctrl.msgsRef}}<br>',
  '<div fire-msgs-crud fire-url="{{ctrl.msgsRef}}"></div>'
  ].join('');
