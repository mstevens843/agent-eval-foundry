export class Builder {
  constructor() {
    this.code = [];
  }
  emit(instruction) {
    this.code.push(instruction);
    return this.code.length - 1;
  }
  patch(index, fields) {
    Object.assign(this.code[index], fields);
  }
  finish(entry) {
    return { entry, code: this.code };
  }
}
