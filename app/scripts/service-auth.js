﻿module.exports = 'gb.FirebaseTest';

angular.module('gb.FirebaseTest')
  .factory('Auth', AuthFactory)
  ;

function AuthFactory(FirebaseRef, $firebaseAuth, $firebaseObject, $state, $rootScope, $q) {
  var auth = $firebaseAuth(FirebaseRef), user;

  user = $q(function(resolve,reject) { resolve(null); });
  auth.$onAuth(onAuth);
  
  return {
    get user() { return user; },
    get requireAuth() { return function() { return auth.$requireAuth(); }; },
    get waitForAuth() { return function() { return auth.$waitForAuth(); }; },
    get onAuth() { return function(fn) { return auth.$onAuth(fn); }; },
    get loginFacebook() { return loginFB; },
    get loginPassword() { return loginPassword; },
    get signupPassword() { return signupPassword; },
    get forgotPassword() { return forgotPassword; },
    get logout() { return function() { return auth.$unauth(); }; },
  };
  
  function loginFB() {
    return auth.$authWithOAuthPopup('facebook')
      .catch(function(reason) {
        if (reason.code === "TRANSPORT_UNAVAILABLE") {
          return auth.$authWithOAuthRedirect('facebook');
        }
        throw reason;
      });
  }
  function loginPassword(email, password) {
    return auth.$authWithPassword({
        email: email,
        password: password
      });
  }
  function signupPassword(email, password) {
    return auth.$createUser({
        email: email,
        password: password
      });
  }
  function forgotPassword(email) {
    return auth.$resetPassword({
        email: email
      });
  }

  function onAuth(authData) {
    if (user)
      user.finally(function(userObj) {
        if (userObj)
          userObj.$destroy();
      });
    if (!authData)
      return (user = $q(function(resolve,reject) { resolve(null); }));
    user =
      $firebaseObject(FirebaseRef.child('userToAccount').child(authData.uid))
        .$loaded()
        .then(function(loginObj) {
          if (!loginObj.provider) {
            loginObj.provider = authData.provider;
            loginObj.accountId = null;
            return loginObj.$save().then(function() { return loginObj; });
          }
          return loginObj;
        });
  }

}
