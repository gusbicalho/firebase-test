module.exports = 'gb.FirebaseTest';

angular.module('gb.FirebaseTest')
  .config(configStates);

var _ = require('lodash');

function configStates($stateProvider) {
  $stateProvider
    .state('board', {
      url: '/board',
      template: BOARD_TEMPLATE,
      resolve: {
        authData: function(Auth) {
          return Auth.waitForAuth();
        }
      },
      controller: BoardController,
      controllerAs: 'ctrl'
    })
    .state('board.index', {
      url: '',
      template: INDEX_TEMPLATE,
      resolve: {},
      controller: IndexController,
      controllerAs: 'indexCtrl'
    })
    .state('board.post', {
      url: '/:postId',
      template: POST_TEMPLATE,
      resolve: {},
      controller: PostController,
      controllerAs: 'postCtrl'
    })
    ;
}

function BoardController(FirebaseRef, Auth, authData, $firebaseObject, $state, $q, $scope) {
  var ctrl = this;

  ctrl.auth = authData;
  ctrl.submitPost = submitPost;
  ctrl.getUserProfile = getUserProfile;
  ctrl.getUsername = getUsername;
  var userProfiles = {};
  $scope.$on('$destroy', _.each.bind(_,userProfiles,function(userObj) {
    userObj.$destroy();
  }));

  var offAuth = Auth.onAuth(function(newAuthData) {
    if ((!!newAuthData !== !!authData) ||
        (newAuthData && authData && newAuthData.uid !== authData.uid)) {
      offAuth();
      $state.reload('board');
    }
  });
  
  function submitPost(post, scope, before, success, error, after, context) {
    if (!authData) return;
    console.log('submitPost',post);
    apply(before.bind(context));
    post = _.cloneDeep(post);
    post.author = authData.uid;
    post.timestamp = Firebase.ServerValue.TIMESTAMP;
    $q(function(res,rej) {
      var newPostRef = FirebaseRef.child('board/posts').push(post, function(error) {
        if (error) return rej(error);
        res(newPostRef);
      });
    })
    .then(function(newPostRef) {
      apply(success.bind(context,newPostRef));
    })
    .catch(function(reason) {
      apply(error.bind(context,reason));
    })
    .finally(function() {
      apply(after.bind(context));
    });
    
    function apply(fn) {
      if (scope)
        scope.$applyAsync(fn);
      else
        fn();
    }
  }

  function getUserProfile(userId) {
    if (!userProfiles[userId])
      userProfiles[userId] = $firebaseObject(FirebaseRef.child('profiles').child(userId));
    return userProfiles[userId];
  }
  function getUsername(userId) {
    var profile = getUserProfile(userId);
    return profile && profile.username ? profile.username : userId;
  }
}

function IndexController(Firebase, FirebaseRef, authData, $firebaseArray, $scope) {
  var indexCtrl = this;
  
  indexCtrl.boardPosts = $firebaseArray(FirebaseRef.child('board/posts').orderByChild('parent').equalTo(null));
  indexCtrl.newPost = {};
  indexCtrl.submitNew = submitNew;

  $scope.$on('$destroy',function(event) {
    indexCtrl.boardPosts.$destroy();
  });

  function submitNew(parent) {
    if (indexCtrl.submittingNew) return;
    $scope.ctrl.submitPost(indexCtrl.newPost, $scope,
      function() { // before
        indexCtrl.submittingNew = true;
      },
      function(answerRef) { // success
        indexCtrl.newPost = {};
        console.log('Post submitted!');
      },
      function(error) { // error
        alert(error.message);
        console.log(error);
      },
      function() { // after
        indexCtrl.submittingNew = false;
      })
  }
}

function PostController(Firebase, FirebaseRef, authData, $firebaseArray, $scope, $q, $state) {
  var postCtrl = this;
  var postId = $state.params.postId;
  var postRef = FirebaseRef.child('board/posts').child(postId);
  
  postCtrl.canEdit = function() { return authData && postCtrl.post.author && postCtrl.post.author === authData.uid; };
  postCtrl.editText = "";
  postCtrl.newAnswer = {};
  postCtrl.post = {};
  postCtrl.saveEdit = saveEdit;
  postCtrl.submitAnswer = submitAnswer;
  postCtrl.answers = $firebaseArray(FirebaseRef.child('board/posts').orderByChild('parent').equalTo(postId));
  postCtrl.edits = $firebaseArray(postRef.child('edits'));
  postCtrl.currentContent = currentContent;

  $scope.$on('$destroy',function(event) {
    postCtrl.answers.$destroy();
    postCtrl.edits.$destroy();
  });
  
  postRef.once('value', function(data) {
    $scope.$applyAsync(function() {
      var post = data.val();
      post.key = data.key();
      delete post.edits;
      postCtrl.post = post;
      postCtrl.postLoaded = true;
    });
  })

  function currentContent() {
    return postCtrl.edits.length > 0?
              _(postCtrl.edits).values().max('timestamp'):
              postCtrl.post;
  }

  function saveEdit() {
    postCtrl.savingEdit = true;
    var edit = {
      text: postCtrl.editText,
      timestamp: Firebase.ServerValue.TIMESTAMP
    };
    $q(function(res,rej) {
      var newEditRef = postRef.child('edits').push(edit, function(error) {
        if (error) return rej(error); res(newEditRef);
      });
    })
    .then(function(newEditRef) {
      postCtrl.editText = "";
    })
    .catch(function(error) {
      alert(error.message);
      console.log(error);
    })
    .finally(function() {
      postCtrl.savingEdit = false;
    });
  }
  
  function submitAnswer() {
    if (!postCtrl.postLoaded || postCtrl.submittingAnswer) return;
    postCtrl.newAnswer.parent = postCtrl.post.key;
    $scope.ctrl.submitPost(postCtrl.newAnswer, $scope,
      function() { // before
        postCtrl.submittingAnswer = true;
      },
      function(answerRef) { // success
        postCtrl.newAnswer = {};
        console.log('answer submitted!');
      },
      function(error) { // error
        alert(error.message);
        console.log(error);
      },
      function() { // after
        postCtrl.submittingAnswer = false;
      });
  }
}

var BOARD_TEMPLATE = [
  '<h2>Board</h2>',
  '<a ui-sref="board.index">Back to Root</a>',
  '<div ui-view></div>',
  ].join('');

var INDEX_TEMPLATE = [
  '<h3>Root</h3>',
  '<form ng-submit="indexCtrl.submitNew()" ng-if="ctrl.auth && ctrl.getUserProfile(ctrl.auth.uid).username" ',
      'style="position:relative;margin:0.5em;padding:0.5em;border:1px dotted #AAA">',
    '<gb-overlay condition="indexCtrl.submittingNew"></gb-overlay>',
    '<h4>New post</h4>',
    'Title: <input ng-model="indexCtrl.newPost.title"><br>',
    'Text:<br>',
    '<textarea ng-model="indexCtrl.newPost.text"></textarea>',
    '<br>',
    '<button type="submit">Submit</button>',
  '</form>',
  '<h4>Posts</h4>',
  '<ul>',
    '<li ng-repeat="post in indexCtrl.boardPosts">',
      '<a ui-sref="board.post({postId:post.$id})">@{{ctrl.getUsername(post.author)}}: {{post.title}}</a>',
    '</li>',
  '</ul>',
  ].join('');

var POST_TEMPLATE = [
  '<div ng-if="postCtrl.postLoaded">',
    '<h3>',
      '{{postCtrl.post.title}} ',
      '<small>by {{ctrl.getUsername(postCtrl.post.author)}}</small> ',
      '<small ng-if="postCtrl.post.parent"><a ui-sref="board.post({postId:postCtrl.post.parent})">Go to Parent</a></small>',
    '</h3>',
    '<div class="post-date" style="font-style:italic">',
      'Posted on {{postCtrl.post.timestamp | date:"medium"}}',
      '<span ng-if="postCtrl.currentContent() !== postCtrl.post">',
        ', last edit on {{postCtrl.currentContent().timestamp | date:"medium"}}',
      '</span>',
    '</div>',
    '<p><pre>{{postCtrl.currentContent().text}}</pre></p>',
    '<form ng-if="postCtrl.canEdit()" ng-submit="postCtrl.saveEdit()" style="position:relative;margin:0.5em;padding:0.5em;border:1px dotted #AAA">',
      '<gb-overlay condition="indexCtrl.savingEdit"></gb-overlay>',
      '<h4>Edit text</h4>',
      '<textarea ng-model="postCtrl.editText"></textarea>',
      '<br>',
      '<button type="submit">Save</button>',
    '</form>',
    '<div ng-if="postCtrl.edits.length > 0" style="position:relative;margin:0.5em;padding:0.5em;border:1px dotted #AAA">',
      '<h4>History</h4>',
      '<div ng-repeat="edit in postCtrl.edits | orderBy:\'timestamp\':true" style="position:relative;margin:0.5em;padding:0.5em;border:1px dotted #AAA">',
        '<strong>Edited on {{edit.timestamp | date:"medium"}}</strong>',
        '<p><pre>{{edit.text}}</pre></p>',
      '</div>',
      '<div style="position:relative;margin:0.5em;padding:0.5em;border:1px dotted #AAA">',
        '<strong>Original post from {{postCtrl.post.timestamp | date:"medium"}}</strong>',
        '<p><pre>{{postCtrl.post.text}}</pre></p>',
      '</div>',
    '</div>',
    '<form ng-submit="postCtrl.submitAnswer()" ng-if="ctrl.auth && ctrl.getUserProfile(ctrl.auth.uid).username" ',
        'style="position:relative;margin:0.5em;padding:0.5em;border:1px dotted #AAA">',
      '<gb-overlay condition="postCtrl.submittingAnswer"></gb-overlay>',
      '<h4>Answer</h4>',
      'Title: <input ng-model="postCtrl.newAnswer.title"><br>',
      'Text:<br>',
      '<textarea ng-model="postCtrl.newAnswer.text"></textarea>',
      '<br>',
      '<button type="submit">Submit</button>',
    '</form>',
    '<h4>Answers</h4>',
    '<ul>',
      '<li ng-repeat="post in postCtrl.answers">',
        '<a ui-sref="board.post({postId:post.$id})">@{{ctrl.getUsername(post.author)}}: {{post.title}}</a>',
      '</li>',
    '</ul>',
  '</div>',
  ].join('');