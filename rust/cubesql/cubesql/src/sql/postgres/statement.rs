use sqlparser::ast;

use crate::sql::statement::{BindValue, StatementParamsBinder};

#[derive(Debug)]
pub struct PreparedStatement {
    pub query: ast::Statement,
}

impl PreparedStatement {
    pub fn bind(&self, values: Vec<BindValue>) -> ast::Statement {
        let mut binder = StatementParamsBinder::new(vec![]);
        let mut statement = self.query.clone();
        binder.bind(&mut statement);

        statement
    }
}
