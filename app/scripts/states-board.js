﻿module.exports = 'gb.FirebaseTest';

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

function BoardController(Auth, authData, $state) {
  var ctrl = this;

  ctrl.auth = authData;
  var offAuth = Auth.onAuth(function(newAuthData) {
    if ((!!newAuthData !== !!authData) ||
        (newAuthData && authData && newAuthData.uid !== authData.uid)) {
      offAuth();
      $state.reload('board');
    }
  });
}

function IndexController(Firebase, FirebaseRef, authData, $scope, $q) {
  var indexCtrl = this;
  
  indexCtrl.boardPosts = [];
  indexCtrl.newPost = {};
  indexCtrl.submitNew = submitNew;

  var rootPostsRef = FirebaseRef.child('board/rootPosts');
  rootPostsRef.on('child_added',postAdded);
  rootPostsRef.on('child_removed',postRemoved);
  $scope.$on('$destroy',function(event) {
    rootPostsRef.off('child_added',postAdded);
    rootPostsRef.off('child_removed',postRemoved);
  });

  function postAdded(data, prev) {
    $scope.$applyAsync(function() {
      var i = prev ?
                1 + _.findIndex(indexCtrl.boardPosts, function(post) { return post.key === prev; }):
                indexCtrl.boardPosts.length;
      var post = {
        key: data.key(),
        data: null,
        ref: FirebaseRef.child('board/posts').child(data.key()),
        onValue: function(data) {
          $scope.$applyAsync(function() { post.data = data.val(); });
        }
      };
      post.ref.on('value',post.onValue);
      $scope.$on('$destroy',function(event) {
        post.ref.off('value',post.onValue);
      });
      indexCtrl.boardPosts.splice(i,0,post);
    });
  }

  function postRemoved(data) {
    $scope.$applyAsync(function() {
      var i = _.findIndex(indexCtrl.boardPosts, function(post) { return post.key === data.key(); });
      if (1 >= 0) {
        var post = indexCtrl.boardPosts[i];
        post.ref.off('value',post.onValue);
        indexCtrl.boardPosts.splice(i,1);
      }
    });
  }

  function submitNew(parent) {
    if (!authData || indexCtrl.submittingNew) return;
    console.log(indexCtrl.newPost);
    indexCtrl.submittingNew = true;
    indexCtrl.newPost.author = authData.uid;
    indexCtrl.newPost.timestamp = Firebase.ServerValue.TIMESTAMP;
    if (parent)
      indexCtrl.newPost.parent = parent;
    $q(function(res,rej) {
      var newPostRef = FirebaseRef.child('board/posts').push(indexCtrl.newPost, function(error) {
        if (error) return rej(error);
        res(newPostRef);
      });
    })
    .then(function(newPostRef) {
      return $q(function(res,rej) {
        FirebaseRef.child('board/rootPosts/'+newPostRef.key()).set(true, function(error) {
          if (error) return rej(error);
          res(newPostRef);
        });
      });
    })
    .then(function(newPostRef) {
      indexCtrl.newPost = {};
    })
    .catch(function(error) {
      alert(error.message);
      console.log(error);
    })
    .finally(function() {
      indexCtrl.submittingNew = false;
    });
  }
}

function PostController(Firebase, FirebaseRef, authData, $scope, $q, $state) {
  var postCtrl = this;
  var postId = $state.params.postId;
  var postRef = FirebaseRef.child('board/posts').child(postId);
  
  postCtrl.canEdit = function() { return postCtrl.post.author && postCtrl.post.author === authData.uid; };
  postCtrl.editText = "";
  postCtrl.post = {};
  postCtrl.saveEdit = saveEdit;
  
  postRef.on('value',postValue);
  $scope.$on('$destroy',function(event) {
    postRef.off('value',postValue);
  });
  
  function postValue(data) {
    $scope.$applyAsync(function() {
      var post = data.val();
      post.currentContent =
        !post.edits? {text: post.text}:
        _.keys(post.edits).length === 0? post.text:
          _(post.edits).values().max('timestamp');
      postCtrl.post = post;
      postCtrl.postLoaded = true;
    });
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
  
}

var BOARD_TEMPLATE = [
  '<h2>Board</h2>',
  '<a ui-sref="board.index">Back to Root</a>',
  '<div ui-view></div>',
  ].join('');

var INDEX_TEMPLATE = [
  '<h3>Root</h3>',
  '<form ng-submit="indexCtrl.submitNew()" ng-if="ctrl.auth" style="position:relative;margin:0.5em;padding:0.5em;border:1px dotted #AAA">',
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
      '<a ui-sref="board.post({postId:post.key})">@{{post.data.author}}: {{post.data.title}}</a>',
    '</li>',
  '</ul>',
  ].join('');

var POST_TEMPLATE = [
  '<div ng-if="postCtrl.postLoaded">',
    '<h3>',
      '{{postCtrl.post.title}} ',
      '<small>by {{postCtrl.post.author}}</small> ',
      '<small ng-if="postCtrl.post.parent"><a ui-sref="board.post({postId:postCtrl.post.parent})">Go to Parent</a></small>',
    '</h3>',
    '<div class="post-date" style="font-style:italic">',
      'Posted on {{postCtrl.post.timestamp | date:"medium"}}',
      '<span ng-if="postCtrl.post.currentContent.timestamp">',
        ', last edit on {{postCtrl.post.currentContent.timestamp | date:"medium"}}',
      '</span>',
    '</div>',
    '<p>{{postCtrl.post.currentContent.text}}</p>',
    '<form ng-if="postCtrl.canEdit()" ng-submit="postCtrl.saveEdit()" style="position:relative;margin:0.5em;padding:0.5em;border:1px dotted #AAA">',
      '<gb-overlay condition="indexCtrl.savingEdit"></gb-overlay>',
      '<h4>Edit text</h4>',
      '<textarea ng-model="postCtrl.editText"></textarea>',
      '<br>',
      '<button type="submit">Save</button>',
    '</form>',
    '<pre>{{postCtrl.post | prettyJSON}}</pre>',
  '</div>',
  ].join('');