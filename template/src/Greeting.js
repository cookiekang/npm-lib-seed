/**
 * 函数功能简述
 *
 * 具体描述一些细节
 *
 * @constructor
 *
 * @param    {string}  name - 名稱
 * @returns  void
 *
 * @date     2017-07-12
 * @author   ben.kang<ben.kang@dji.com>
 **/


class Greeting {
  constructor(name) {
    this.name = name || 'Guest'
  }

  hello() {
    return `Welcome, ${this.name}!`
  }
}

module.exports = Greeting;
