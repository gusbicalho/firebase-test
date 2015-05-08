module.exports = 'gb.FirebaseTest';

angular.module('gb.FirebaseTest')
  .config(configStates);

configStates.$inject = ['$stateProvider'];
function configStates($stateProvider) {
  $stateProvider
    .state('user', {
      url: '/user',
      template: TEMPLATE,
      resolve: {
        User: function(Auth) {
          return Auth.getUser();
        },
        authData: function(Auth) {
          return Auth.waitForAuth();
        }
      },
      onExit: function(User) {
        if (User)
          User.$destroy();
      },
      controller: Controller,
      controllerAs: 'ctrl'
    })
    ;
}

function Controller(FirebaseRef, Auth, User, authData, $state, $scope, $q) {
  var ctrl = this;

  ctrl.auth = authData;
  ctrl.newUsername = "";
  ctrl.saveUsername = saveUsername;
  if (User)
    User.$bindTo($scope, 'ctrl.user');
  
  var offAuth = Auth.onAuth(function(newAuthData) {
    if ((!!newAuthData !== !!authData) ||
        (newAuthData && authData && newAuthData.uid !== authData.uid)) {
      offAuth();
      $state.reload('user');
    }
  });
  
  function saveUsername() {
    $scope.$applyAsync(function(){ctrl.savingUsername = true;});
    var username = ctrl.newUsername.trim(), oldUsername = User.username, operation;
    if (!username) username = null;
    $q(username ? claimNewUsername : function(res){res(null);})
    .then(function(claimedRef) {
      return $q(setNewUsername.bind(null,claimedRef))
              .catch(function(setError) { // error setting username
                return $q(unclaimNewUsername.bind(null,claimedRef,setError));
              });
    })
    .then(function(claimedRef) { // unclaim old username
      if (!oldUsername) return claimedRef;
      return $q(unclaimOldUsername.bind(null, claimedRef));
    })
    .catch(function(reason) {
      console.error(reason);
      if (reason.step === 'unclaim')
        return;
      var message =
        reason.step === 'claim'? 'Username is taken.' :
        reason.step === 'set'? 'Error setting username.' :
        reason.step === 'unroll claim'? 'Error setting username, please try again.':
        '';
      alert(message+'\n'+(reason.error?reason.error.message:reason.message));
      console.error(reason);
    })
    .finally($scope.$applyAsync.bind($scope, function(){
        ctrl.savingUsername = false;
    }));
    
    function claimNewUsername(res,rej) { // claim username
      var claimedRef = FirebaseRef.child('usernames').child(username);
      claimedRef.set(authData.uid, function(error) {
        console.log('here set',error);
        if (error) return rej({step:'claim', error: error}); res(claimedRef);
      })
    }
    function setNewUsername(result, res, rej) {
      User.$ref().child('username')
        .set(username, function(error) {
          if (error) return rej({step: 'set', error: error}); res(result);
        })
    }
    function unclaimNewUsername(claimedRef,cause,res,rej) { // unclaim username
      if (!claimedRef)
        return rej(cause);
      claimedRef.set(null, function(unclaimError) {
        if (!unclaimError) rej(cause); // unclaimed, propagate cause
        // failure to unclaim
        rej({step: 'unroll claim', error: unclaimError, cause: cause});
      });
    }
    function unclaimOldUsername(result, resolve, reject) {
      FirebaseRef.child('usernames').child(oldUsername)
        .set(null, function(error) {
          if (error) return reject({step:'unclaim', error: error}); resolve(result);
        });
    }
  }
}

var TEMPLATE = [
  '<h2>User</h2>',
  '<form ng-submit="ctrl.saveUsername()" ng-if="ctrl.auth" style="position:relative;margin:0.5em;padding:0.5em;border:1px dotted #AAA">',
    '<gb-overlay condition="ctrl.savingUsername"></gb-overlay>',
    'Change username: <input ng-model="ctrl.newUsername">',
    '<button type="submit">Change</button>',
  '</form>',
  '<pre>{{ctrl.user | prettyJSON}}</pre>'
  ].join('');
