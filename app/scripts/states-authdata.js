module.exports = 'gb.FirebaseTest';

angular.module('gb.FirebaseTest')
  .config(configStates);

configStates.$inject = ['$stateProvider'];
function configStates($stateProvider) {
  $stateProvider
    .state('authData', {
      url: '/authdata',
      template: TEMPLATE,
      resolve: {
        authData: ['Auth', function(Auth) {
          return Auth.waitForAuth();
        }]
      },
      controller: Controller,
      controllerAs: 'ctrl'
    })
    ;
}

function Controller(Auth, authData, $state, $scope) {
  var ctrl = this;

  ctrl.authData = authData;
  
  var offAuth = Auth.onAuth(function(newAuthData) {
    if ((!!newAuthData !== !!authData) ||
        (newAuthData && authData && newAuthData.uid !== authData.uid)) {
      offAuth();
      $state.reload('authData');
    }
  });
}

var TEMPLATE = [
  '<h2>AuthData</h2>',
  '<pre>{{ctrl.authData | prettyJSON}}</pre>'
  ].join('');
