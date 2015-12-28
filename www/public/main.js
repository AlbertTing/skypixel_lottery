function s3() {
	  var bucket = new AWS.S3({params: {Bucket: 'skypixel-front-prod'}});
	  var params = {
	  	Bucket: 'skypixel-front-prod',
	  	Key: 'AKIAIRKNYFZBHSS2COTA'
	  };

}


function populateDB(tx) {
	tx.executeSql('DROP TABLE IF EXISTS t_award_batch');
	// tx.executeSql('DROP TABLE IF EXISTS t_award_pool');
	// tx.executeSql('DROP TABLE IF EXISTS t_record');
	tx.executeSql('CREATE TABLE IF NOT EXISTS t_award_batch (id unique, name, amount)');
	tx.executeSql('CREATE TABLE IF NOT EXISTS t_award_pool (id unique, award_id, release_number, balance)');
	tx.executeSql('CREATE TABLE IF NOT EXISTS t_record (id unique, email, award_id, release_number, time)');
	tx.executeSql('INSERT INTO t_award_batch (id, name, amount) VALUES (1, "p3", 1)');
	tx.executeSql('INSERT INTO t_award_batch (id, name, amount) VALUES (2, "$100", 20)');
	// tx.executeSql('INSERT INTO t_record (id, email, award_id, release_number) VALUES (1, "haha@163.com", 0, 1)');
	// tx.executeSql('INSERT INTO t_record (id, email, award_id, release_number) VALUES (2, "hah@qq.com", 0, 2)');
}

function errorCB(err) {
	alert("Error processing SQL: " + err.code);
}

function successCB() {
	// alert("success!");
}

function getISOTimeFormat() {
	var date = new Date(),
		y = date.getFullYear(),
		m = date.getMonth() + 1,
		d = date.getDate(),
		h = date.getHours(),
		M = date.getMinutes(),
		s = date.getSeconds();
	return [
		[y, m < 10 ? "0" + m : m, d < 10 ? "0" + d : d].join("-"), [h < 10 ? "0" + h : h, M < 10 ? "0" + M : M, s < 10 ? "0" + s : s].join(":")
	].join(" ");
}


function formatSql(str, obj) {
	if (!str || typeof obj !== 'object') return;
	for (var key in obj) {
		var name = '${' + key + '}';
		while (str.indexOf(name) > -1) {
			str = str.replace(name, typeof obj[key] != 'string' ? obj[key] : ("'" + obj[key] + "'"));
		}
	}
	return str;
}

function transUserData2String(data) {
	var str = '';
	forEach(data, function(value, key) {
		if (key && value) {
			var item = '$$' + key + '|' + value;
			str += item;
		}
	});
	return str;
}

function transUserData2Object(str) {
	var data = {};
	if (!str) {
		return false;
	}
	str = str.split('$$');
	str.forEach(function(item, i) {
		item = item.split('|');
		if (item.length > 1 && item[1] && item[0]) {
			data[item[0]] = item[1];
		}
	});
	return data;
}

function forEach(obj, fn, context) {
	Object.keys(obj).forEach(function(key) {
		fn.call(context, obj[key], key)
	});
}

//init phonegap api
angular.module('PhoneGap', [])
	.factory('PhoneGap', function($q, $rootScope, $document) {
		var deferred = $q.defer();

		$document.bind('deviceready', function() {
			$rootScope.$apply(deferred.resolve);
		});

		return {
			ready: function() {
				return deferred.promise;
			}
		};
	})
	.run(function(PhoneGap) {});


//Storage
angular.module('PhoneGap')
	.factory('Storage', function(PhoneGap) {

		return {
			remove: function() {

			},
			set: function(name, data) {
				var value = typeof data == 'object' ? transUserData2String(data) : data;
				window.localStorage.setItem(name, value);
			},

			get: function(name) {
				return window.localStorage.getItem(name);
			}
		};
	});


angular.module('PhoneGap')
	.factory('DB', function($q, PhoneGap) {
		var DB;

		return {
			//初始化表结构及初始奖项数据
			init: function() {
				this.open();
				DB.transaction(populateDB, errorCB, successCB);
				// this.setAward(4);
			},

			open: function() {
				DB = window.openDatabase("Skypixel_Lottery", "1.0", "Skypixel Lottery", 1000000);
				// alert(window.sqlitePlugin)
				// DB = window.sqlitePlugin.openDatabase({name: "Skypixel_Lottery.sqlite", createFromLocation: 1});
				return DB;
			},

			executeSql: function(sql, isSingle) {
				var defer = $q.defer();
				this.open();
				DB.transaction(function(tx) {
					tx.executeSql(sql, [], function(tx, results) {
						// alert(results.rows)
						defer.resolve(isSingle ? (results.rows.length ? results.rows.item(0) : false) : results.rows);
					}, function() {
						errorCB();
						defer.reject();
					});
				}, function() {
					errorCB();
					defer.reject();
				});
				return defer.promise;
			},

			querySingle: function(sql) {
				return this.executeSql(sql, true);
			},

			getRecord: function(email) {
				var sql = "SELECT * FROM t_record where email = '" + email + "'";
				return this.querySingle(sql);
			},

			addRecord: function(id, email, award_id, release_number) {
				var time = getISOTimeFormat();
				var sql = "INSERT INTO t_record (id, email, award_id, release_number, time) VALUES (${id}, ${email}, ${award_id}, ${release_number}, ${time})";
				sql = formatSql(sql, {
					id: id,
					email: email,
					award_id: award_id,
					release_number: release_number,
					time: time
				})

				return this.executeSql(sql);
			},

			getRecordAmount: function() {
				var sql = "SELECT COUNT(*) as total FROM t_record";
				return this.querySingle(sql);
			},

			checkIsAward: function(release_number) {
				var sql = "SELECT * FROM t_award_pool where release_number = " + release_number;
				return this.querySingle(sql);
			},

			getPool: function() {
				var sql = "SELECT COUNT(*) as total FROM t_award_pool";
				return this.querySingle(sql);
			},

			insertPool: function(id, award_id, release_number) {
				var sql = "INSERT INTO t_award_pool (id, award_id, release_number, balance) VALUES (" + id + "," + award_id + ", " + release_number + ", 1)";
				return this.executeSql(sql);
			},

			deleteAward: function(release_number) {
				var sql = "UPDATE t_award_pool SET balance = 0 where release_number =" + release_number;
				return this.executeSql(sql).then(function() {
					// alert('delete award success')
				});
			},

			getRemainAward: function() {
				var sql = "SELECT * FROM t_award_pool where balance > 0";
				return this.executeSql(sql);
			},

			setAward: function(release_number) {
				var sql = "UPDATE t_award_pool SET release_number = " + release_number + " where id = 1";
				return this.executeSql(sql);
			}
		};
	});


//init prize pool
angular.module('PhoneGap')
	.factory('PrizePool', function(PhoneGap, Storage, DB) {

		function getRandomInt(min, max) {
			return Math.floor(Math.random() * (max - min)) + min + 1;
		}

		function getPrizeKeys(number, total, keys) {
			var arr = [];
			var randomKey = Math.floor(total / number);
			for (var i = 0; i < number; i++) {
				var key = getRandomInt(i * randomKey, (i + 1) * randomKey);
				if (keys) {
					while (!checkIsUniq(key, keys)) {
						key = getRandomInt(i * randomKey, (i + 1) * randomKey);
					}
				}
				arr.push(key);
			}

			return arr;
		}

		function checkIsUniq(key, keys) {
			if (keys.indexOf(key) > -1) {
				return false
			} else {
				return true;
			}
		}

		return {
			init: function(op) {
				// var initKey = Storage.get('initLottery');
				var totalUsers = op.totalUsers;
				var couponNum = op.couponNum;
				var p3Num = op.p3Num;

				// if (initKey) {
				// 	return;
				// }

				var couponPrizeArray = getPrizeKeys(couponNum, totalUsers);
				var p3PrizeArray = getPrizeKeys(p3Num, totalUsers, couponPrizeArray);

				// console.log(couponPrizeArray, p3PrizeArray)

				// couponPrizeArray.forEach(function(key) {
				// 	Storage.set('couponKey_' + key, key);
				// })

				// p3PrizeArray.forEach(function(key) {
				// 	Storage.set('p3Key_' + key, key);
				// })

				// Storage.set('initLottery', true);

				DB.getPool().then(function(res) {
					//初始化抽奖池
					if(res.total < 1) {
						couponPrizeArray.forEach(function(key, i) {
							DB.insertPool( i + 1, 2, key);
						})

						p3PrizeArray.forEach(function(key, i) {
							DB.insertPool(couponPrizeArray.length + 1, 1, key);
						})
					}
				}).fail(function() {
					alert('get pool fail');
				})

			}
		};
	});


//main
angular.module('skypixelApp', ['PhoneGap'])
	.controller('skypixelController', ['$rootScope', '$scope', '$window', '$document', 'Storage', 'PrizePool', '$timeout', 'DB', 'PhoneGap',
		function($rootScope, $scope, $window, $document, Storage, PrizePool, $timeout, DB, PhoneGap) {

			var Model = {
				email: '',
				currentPage: 0,
				showError: false,
				showProgress: false,
				win: false,

				//core options
				totalUsers: 1000,
				//test
				totalUsers: 50,
				joinedUsers: 0,
				all_prizes: {
					p3: 1,
					coupon: 20
				},
				remain_prizes: {
					p3: 0,
					coupon: 0
				}
			}

			var Controller = {
				init: function() {
					PhoneGap.ready().then(function() {
						DB.init();
						PrizePool.init({
							totalUsers: $scope.totalUsers,
							p3Num: $scope.all_prizes.p3,
							couponNum: $scope.all_prizes.coupon
						});
					})
				},

				updatePrize: function() {

				},

				// getRecords: function() {
				// 	var joinedUsers = Storage.get('totalUser');
				// 	return {
				// 		joinedUsers: joinedUsers
				// 	}
				// },

				showRecord: function() {
					// var records = $scope.getRecords();
					// angular.extend($scope, {
					// 	// remain_prizes: {

					// 	// },
					// 	joinedUsers: records.joinedUsers,
					// 	currentPage: 4
					// });

					// 获取以抽奖人数
					DB.getRecordAmount().then(function(res) {
						angular.extend($scope, {
							joinedUsers: res.total,
							currentPage: 4
						});
					});

					//剩余奖品数量
					DB.getRemainAward().then(function(list) {

						var p3Remain = 0;
						var CouponRemain = 0;
						for(var i=0; i< list.length; i++) {
							if(list.item(i).award_id === 1) {
								p3Remain += 1
							}

							if(list.item(i).award_id === 2) {
								CouponRemain += 1;
							}
						}
						angular.extend($scope.remain_prizes, {
							p3: p3Remain,
							coupon: CouponRemain
						});

					});

				},
				check: function() {
					// var $email = document.getElementById('email');
					// var value = $email.value;
					if (/^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-z0-9-]+(\.[a-z0-9-]+)*$/i.test($scope.email)) {
						return true;
					} else {
						return false;
					}
				},

				start: function() {
					$scope.currentPage = 1;
				},

				reset: function() {
					angular.extend($scope, {
						email: '',
						currentPage: 0,
						showError: false,
						showProgress: false,
						win: false
					});
				},

				submit: function() {
					// console.log($scope.email);
					// if (Storage.get($scope.email)) {
					// 	$scope.showError = true;
					// } else {
					// 	$scope.showError = false;
					// 	$scope.currentPage = 2;
					// }

					DB.getRecord($scope.email).then(function(res) {
						if(res) {
							$scope.showError = true;
						} else {
							$scope.showError = false;
							$scope.currentPage = 2;
						}
					}).fail(function() {
						alert('read record failed')
					})
				},

				onPrize: function() {
					$scope.showProgress = true;
					// var curNum = Storage.get('totalUser') || 0;
					// curNum++;
					// //累计投票次数
					// Storage.set('totalUser', curNum);

					// var couponPrize = Storage.get('couponKey_' + curNum);
					// var p3Prize = Storage.get('p3Key_' + curNum);

					// if (couponPrize) {
					// 	$scope.win = 2;
					// 	//存入用户投票记录
					// 	Storage.set($scope.email, couponPrize);
					// } else if (p3Prize) {
					// 	$scope.win = 1;
					// 	Storage.set($scope.email, p3Prize);
					// } else {
					// 	$scope.win = false;
					// 	Storage.set($scope.email, curNum);
					// }

					// $timeout(function() {
					// 	$scope.showProgress = false;
					// 	$scope.currentPage = 3;
					// }, 500);


					DB.getRecordAmount().then(function(res) {
						var key = res.total + 1;

						DB.checkIsAward(key).then(function(rs) {

							//中了$100
							if (rs && rs.award_id == 2) {
								$scope.win = 2;
							}
							//中了 phantom3
							else if (rs && rs.award_id == 1) {
								$scope.win = 1;
							} else {
								$scope.win = false;
							}

							//中奖了删掉奖品
							if(rs.award_id) {
								DB.deleteAward(key);
							}
							//存入用户抽奖记录
							DB.addRecord(key, $scope.email, rs.award_id || 0, key);

							$timeout(function() {
								$scope.showProgress = false;
								$scope.currentPage = 3;
							}, 500);
						})
					});

				}
			}

			angular.extend($scope, Model);
			angular.extend($scope, Controller);

			$scope.init();
		}
	]);
